'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWriteContract } from 'wagmi'
import { parseEventLogs, zeroAddress, type Address, type Hex, type TransactionReceipt } from 'viem'
import { blitzAbi } from './abi'
import { BLITZ_ADDRESS, botChain, publicClient } from './chain'
import { explainError, formatBot } from './format'
import { floatBudget, getOrCreateSessionAccount, loadSessionAccount, SessionSender } from './session'

export type TxKind = 'start' | 'action' | 'finalize' | 'sweep'
export type TxStatus = 'requested' | 'pending' | 'confirmed' | 'failed'
export type TxEntry = {
  id: number
  kind: TxKind
  label: string
  status: TxStatus
  hash?: Hex
  ms?: number
  note?: string
}

export type RoundView = {
  id: bigint
  startTime: number
  endTime: number
  target: number
  step: number
  score: number
  misses: number
  sessionKey: Address
  finalized: boolean
}

export type Phase = 'loading' | 'idle' | 'starting' | 'live' | 'settling' | 'done'
export type Mode = 'session' | 'wallet'

export type Result = {
  roundId: bigint
  score: number
  misses: number
  bestScore: number
  bestRoundId: bigint
  isNewBest: boolean
  rank: number | null
}

export type Flash = { cell: number; correct: boolean; key: number }

const RECEIPT = { pollingInterval: 150, timeout: 45_000 } as const
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function readRound(id: bigint): Promise<RoundView> {
  const r = await publicClient.readContract({ address: BLITZ_ADDRESS!, abi: blitzAbi, functionName: 'getRound', args: [id] })
  return {
    id,
    startTime: Number(r.startTime),
    endTime: Number(r.endTime),
    target: r.currentTarget,
    step: r.step,
    score: r.score,
    misses: r.misses,
    sessionKey: r.sessionKey,
    finalized: r.finalized,
  }
}

async function readChainSkewMs() {
  const block = await publicClient.getBlock({ blockTag: 'latest' })
  // block.timestamp is floored to the second; +500ms centres the estimate.
  return Number(block.timestamp) * 1000 + 500 - Date.now()
}

export function useBlitzGame(player: Address | undefined, ready: boolean) {
  const { writeContractAsync } = useWriteContract()

  const [phase, setPhase] = useState<Phase>('loading')
  const [round, setRoundState] = useState<RoundView | null>(null)
  const [mode, setMode] = useState<Mode>('session')
  const [preferSession, setPreferSession] = useState(true)
  const [pendingCell, setPendingCell] = useState<number | null>(null)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [log, setLog] = useState<TxEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [latencies, setLatencies] = useState<number[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [needsManualSettle, setNeedsManualSettle] = useState(false)

  const roundRef = useRef<RoundView | null>(null)
  const senderRef = useRef<SessionSender | null>(null)
  const skewRef = useRef(0)
  const pendingRef = useRef(false)
  const settlingRef = useRef(false)
  const logId = useRef(0)
  const phaseRef = useRef<Phase>(phase)
  phaseRef.current = phase

  const setRound = useCallback((r: RoundView | null) => {
    roundRef.current = r
    setRoundState(r)
  }, [])

  const addLog = useCallback((entry: Omit<TxEntry, 'id'>) => {
    const id = ++logId.current
    setLog((l) => [{ ...entry, id }, ...l].slice(0, 40))
    return id
  }, [])
  const patchLog = useCallback((id: number, patch: Partial<TxEntry>) => {
    setLog((l) => l.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }, [])

  const timeLeftMs = round ? Math.max(0, round.endTime * 1000 - (now + skewRef.current)) : 0

  // ---------------------------------------------------------------- result

  const loadResult = useCallback(
    async (id: bigint) => {
      const [r, stats, board] = await Promise.all([
        readRound(id),
        publicClient.readContract({ address: BLITZ_ADDRESS!, abi: blitzAbi, functionName: 'getPlayer', args: [player!] }),
        publicClient.readContract({ address: BLITZ_ADDRESS!, abi: blitzAbi, functionName: 'getLeaderboard' }),
      ])
      const idx = board[0].findIndex((a) => a.toLowerCase() === player!.toLowerCase())
      setRound(r)
      setResult({
        roundId: id,
        score: r.score,
        misses: r.misses,
        bestScore: Number(stats.bestScore),
        bestRoundId: stats.bestRoundId,
        isNewBest: stats.bestRoundId === id && r.score > 0,
        rank: idx >= 0 ? idx + 1 : null,
      })
      setPhase('done')
    },
    [player, setRound],
  )

  // ---------------------------------------------------------------- settle

  const sweep = useCallback(async () => {
    const sender = senderRef.current
    if (!sender || !player) return
    try {
      const out = await sender.sweepTo(player)
      if (!out) return
      const id = addLog({ kind: 'sweep', label: `Float returned · ${formatBot(out.value)} BOT`, status: 'pending', hash: out.hash })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: out.hash, ...RECEIPT })
      patchLog(id, { status: receipt.status === 'success' ? 'confirmed' : 'failed' })
    } catch {
      // Not fatal: the float stays on the session key and is reused next round.
    }
  }, [addLog, patchLog, player])

  const settle = useCallback(
    async (viaWallet = false) => {
      const r = roundRef.current
      if (!r || !player || settlingRef.current) return
      settlingRef.current = true
      setPhase('settling')
      setError(null)
      try {
        while (pendingRef.current) await sleep(100)

        const current = await readRound(r.id)
        if (current.finalized) {
          await loadResult(r.id)
          return
        }

        const sender = senderRef.current
        if (!viaWallet && (!sender || mode === 'wallet')) {
          // Signing every tap in the wallet: ask before popping one more request.
          setNeedsManualSettle(true)
          return
        }
        setNeedsManualSettle(false)

        // The chain, not our clock, decides expiry. Wait until a block is past endTime.
        for (let i = 0; i < 40; i++) {
          try {
            await publicClient.simulateContract({
              address: BLITZ_ADDRESS!,
              abi: blitzAbi,
              functionName: 'finalizeRound',
              args: [r.id],
              account: viaWallet ? player : sender!.account.address,
            })
            break
          } catch (err) {
            const msg = String((err as Error)?.message)
            if (/RoundAlreadyFinalized/.test(msg)) {
              await loadResult(r.id)
              return
            }
            if (!/RoundNotExpired/.test(msg)) throw err
            await sleep(500)
          }
        }

        const t0 = performance.now()
        const id = addLog({ kind: 'finalize', label: 'Settle round', status: viaWallet ? 'requested' : 'pending' })
        let hash: Hex
        if (viaWallet) {
          hash = await writeContractAsync({
            address: BLITZ_ADDRESS!,
            abi: blitzAbi,
            functionName: 'finalizeRound',
            args: [r.id],
            chainId: botChain.id,
          })
          patchLog(id, { status: 'pending', hash })
        } else {
          hash = await sender!.finalize(r.id)
          patchLog(id, { hash })
        }
        const receipt = await publicClient.waitForTransactionReceipt({ hash, ...RECEIPT })
        if (receipt.status !== 'success') {
          patchLog(id, { status: 'failed', note: 'Reverted' })
          const again = await readRound(r.id)
          if (!again.finalized) throw new Error('Settlement reverted')
        } else {
          patchLog(id, { status: 'confirmed', ms: performance.now() - t0 })
        }
        await loadResult(r.id)
        if (!viaWallet) await sweep()
      } catch (err) {
        setError(`${explainError(err)} Your score is already fixed on-chain; settling only records it.`)
        setNeedsManualSettle(true)
      } finally {
        settlingRef.current = false
      }
    },
    [addLog, loadResult, mode, patchLog, player, sweep, writeContractAsync],
  )

  // ---------------------------------------------------------------- load / resume from chain

  const load = useCallback(async () => {
    if (!player || !ready || !BLITZ_ADDRESS) return
    setPhase('loading')
    setError(null)
    setResult(null)
    setLog([])
    setLatencies([])
    senderRef.current = null
    try {
      const [stats, skew] = await Promise.all([
        publicClient.readContract({ address: BLITZ_ADDRESS, abi: blitzAbi, functionName: 'getPlayer', args: [player] }),
        readChainSkewMs(),
      ])
      skewRef.current = skew
      setNow(Date.now())
      if (stats.activeRoundId === 0n) {
        setRound(null)
        setPhase('idle')
        return
      }
      const r = await readRound(stats.activeRoundId)
      setRound(r)
      const local = loadSessionAccount(player)
      if (local && local.address.toLowerCase() === r.sessionKey.toLowerCase()) {
        const sender = new SessionSender(local, await publicClient.getGasPrice())
        await sender.sync()
        senderRef.current = sender
        setMode('session')
      } else {
        setMode('wallet') // e.g. resumed in another browser: every tap is signed in the wallet
      }
      const expired = r.endTime * 1000 <= Date.now() + skew
      if (expired) void settle()
      else setPhase('live')
    } catch (err) {
      setError(explainError(err))
      setPhase('idle')
    }
  }, [player, ready, setRound, settle])

  useEffect(() => {
    if (!player || !ready) {
      setPhase('loading')
      setRound(null)
      return
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, ready])

  // ---------------------------------------------------------------- clock

  useEffect(() => {
    if (phase !== 'live') return
    const t = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (phase === 'live' && round && timeLeftMs <= 0) void settle()
  }, [phase, round, timeLeftMs, settle])

  // ---------------------------------------------------------------- start

  const start = useCallback(async () => {
    if (!player || !ready || !BLITZ_ADDRESS || phase === 'starting') return
    setError(null)
    setResult(null)
    setLog([])
    setLatencies([])
    setPhase('starting')
    let logEntry = 0
    let hash: Hex | undefined
    try {
      const account = preferSession ? getOrCreateSessionAccount(player) : null
      const gasPrice = await publicClient.getGasPrice()
      let value = 0n
      if (account) {
        const budget = floatBudget(gasPrice)
        const held = await publicClient.getBalance({ address: account.address })
        value = held >= budget ? 0n : budget - held
      }
      const balance = await publicClient.getBalance({ address: player })
      if (balance < value + gasPrice * 400_000n) {
        setError(`Not enough BOT. This round needs about ${formatBot(value + gasPrice * 400_000n)} BOT including the gas float.`)
        setPhase('idle')
        return
      }

      const t0 = performance.now()
      logEntry = addLog({
        kind: 'start',
        label: value > 0n ? `Start round · ${formatBot(value)} BOT float` : 'Start round',
        status: 'requested',
      })
      hash = await writeContractAsync({
        address: BLITZ_ADDRESS,
        abi: blitzAbi,
        functionName: 'startRound',
        args: [account?.address ?? zeroAddress],
        value,
        chainId: botChain.id,
      })
      patchLog(logEntry, { status: 'pending', hash })
      const receipt = await publicClient.waitForTransactionReceipt({ hash, ...RECEIPT })
      if (receipt.status !== 'success') throw new Error('startRound reverted')

      const [started] = parseEventLogs({ abi: blitzAbi, logs: receipt.logs, eventName: 'RoundStarted' })
      patchLog(logEntry, { status: 'confirmed', ms: performance.now() - t0 })

      const [r, skew] = await Promise.all([readRound(started.args.roundId), readChainSkewMs()])
      skewRef.current = skew
      if (account) {
        const sender = new SessionSender(account, gasPrice)
        await sender.sync()
        senderRef.current = sender
        setMode('session')
      } else {
        senderRef.current = null
        setMode('wallet')
      }
      setRound(r)
      setNow(Date.now())
      setPhase('live')
    } catch (err) {
      if (logEntry) patchLog(logEntry, { status: 'failed', note: explainError(err) })
      setError(explainError(err))
      // If a hash went out, the round may exist even though we lost track: trust the chain.
      if (hash) await load()
      else setPhase('idle')
    }
  }, [addLog, load, patchLog, phase, player, preferSession, ready, writeContractAsync])

  // ---------------------------------------------------------------- tap

  const applyReceipt = useCallback(
    (receipt: TransactionReceipt) => {
      const [ev] = parseEventLogs({ abi: blitzAbi, logs: receipt.logs, eventName: 'ActionSubmitted' })
      const r = roundRef.current
      if (!ev || !r) return null
      const { step, choice, correct, score, nextTarget } = ev.args
      setRound({
        ...r,
        score,
        step: correct ? step + 1 : step,
        target: nextTarget,
        misses: correct ? r.misses : r.misses + 1,
      })
      return { choice, correct }
    },
    [setRound],
  )

  const tap = useCallback(
    async (cell: number) => {
      const r = roundRef.current
      // Read the clock from refs so this callback stays stable across timer ticks (keeps the memoised grid still).
      const expired = !r || r.endTime * 1000 <= Date.now() + skewRef.current
      if (phaseRef.current !== 'live' || !r || pendingRef.current || expired) return
      pendingRef.current = true
      setPendingCell(cell)
      setError(null)
      const t0 = performance.now()
      const sender = senderRef.current
      const id = addLog({
        kind: 'action',
        label: `Tap cell ${cell + 1} · step ${r.step + 1}`,
        status: sender ? 'pending' : 'requested',
      })
      try {
        let hash: Hex
        if (sender) {
          hash = await sender.submitAction(r.id, r.step, cell)
          patchLog(id, { hash })
        } else {
          hash = await writeContractAsync({
            address: BLITZ_ADDRESS!,
            abi: blitzAbi,
            functionName: 'submitAction',
            args: [r.id, r.step, cell],
            chainId: botChain.id,
          })
          patchLog(id, { status: 'pending', hash })
        }
        const receipt = await publicClient.waitForTransactionReceipt({ hash, ...RECEIPT })
        const ms = performance.now() - t0
        if (receipt.status !== 'success') {
          patchLog(id, { status: 'failed', ms, note: 'Reverted on-chain - no point' })
          setRound(await readRound(r.id))
          return
        }
        const out = applyReceipt(receipt)
        patchLog(id, { status: 'confirmed', ms, note: out?.correct ? '+1 point' : 'Miss - no point' })
        setLatencies((l) => [...l, ms])
        if (out) setFlash({ cell, correct: out.correct, key: Date.now() })
      } catch (err) {
        patchLog(id, { status: 'failed', note: explainError(err) })
        setError(explainError(err))
        try {
          setRound(await readRound(r.id)) // never trust local state after a failure
        } catch {
          /* keep last confirmed state */
        }
      } finally {
        pendingRef.current = false
        setPendingCell(null)
      }
    },
    [addLog, applyReceipt, patchLog, setRound, writeContractAsync],
  )

  const reset = useCallback(() => {
    setResult(null)
    setRound(null)
    setPhase('idle')
    setError(null)
  }, [setRound])

  const avgLatencyMs = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null

  return {
    phase,
    round,
    mode,
    preferSession,
    setPreferSession,
    timeLeftMs,
    pendingCell,
    flash,
    log,
    error,
    result,
    needsManualSettle,
    avgLatencyMs,
    lastLatencyMs: latencies.at(-1) ?? null,
    confirmedTaps: latencies.length,
    start,
    tap,
    settle,
    reset,
    reload: load,
  }
}
