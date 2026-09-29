'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { isAddress, type Address } from 'viem'
import { useQueryClient } from '@tanstack/react-query'
import { Banner } from '@/components/Banner'
import { IconCopy, IconKey, IconLink } from '@/components/Icons'
import { GateBanner, useGate } from '@/components/WalletGate'
import { explorerAddress, explorerTx, publicClient, SYMBOL_NAME } from '@/lib/chain'
import { explainError, formatBot, formatCount } from '@/lib/format'
import { useBalance, usePlayerHistory, usePlayerStats } from '@/lib/reads'
import { loadSessionAccount, SessionSender } from '@/lib/session'

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <Profile />
    </Suspense>
  )
}

function Profile() {
  const params = useSearchParams()
  const gate = useGate()
  const param = params.get('address')
  const viewing = (param && isAddress(param) ? param : gate.address) as Address | undefined
  const isOwn = Boolean(viewing && gate.address && viewing.toLowerCase() === gate.address.toLowerCase())

  const stats = usePlayerStats(viewing)
  const history = usePlayerHistory(viewing, 10)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!viewing) return
    try {
      await navigator.clipboard.writeText(viewing)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: the full address is still selectable */
    }
  }

  if (!viewing) {
    return (
      <div className="mx-auto max-w-md px-4 pb-16 pt-10">
        <p className="eyebrow">Profile</p>
        <h1 className="mt-4 text-[1.875rem] leading-[1.1]">Your on-chain record.</h1>
        <div className="mt-6">{gate.state !== 'loading' && gate.state !== 'ready' ? <GateBanner state={gate.state} /> : null}</div>
      </div>
    )
  }

  const s = stats.data
  const nowSec = Date.now() / 1000
  const url = explorerAddress(viewing)

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <p className="eyebrow">{isOwn ? 'Your profile' : 'Player profile'}</p>
      <h1 className="mt-4 text-[1.875rem] leading-[1.1] sm:text-[2.25rem]">{isOwn ? 'Your on-chain record.' : 'On-chain record.'}</h1>

      <div className="card-sm mt-6 flex flex-wrap items-center gap-3 p-4">
        <p className="min-w-0 flex-1 break-all font-mono text-[0.8125rem] text-ink" title={viewing}>{viewing}</p>
        <button type="button" onClick={copy} className="chip" aria-label="Copy address">
          <IconCopy />
        </button>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="chip" aria-label="View address on BOTScan">
            <IconLink />
          </a>
        ) : null}
        <span className="sr-only" role="status">{copied ? 'Address copied' : ''}</span>
      </div>

      {gate.state === 'wrong-network' && isOwn ? <div className="mt-3"><GateBanner state="wrong-network" /></div> : null}
      {stats.isError ? (
        <div className="mt-3">
          <Banner tone="error" lead="Could not read stats." action={<button className="btn-ghost !px-5 !py-2 text-sm" onClick={() => stats.refetch()}>Try again</button>}>
            The BOT Chain RPC did not answer.
          </Banner>
        </div>
      ) : null}

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Best score" value={s ? formatCount(s.bestScore) : undefined} strong />
        <Stat label="Best round" value={s ? (s.bestRoundId ? `#${s.bestRoundId}` : '-') : undefined} />
        <Stat label="Rounds completed" value={s ? formatCount(s.totalRounds) : undefined} />
        <Stat label="Valid actions" value={s ? formatCount(s.totalValidActions) : undefined} />
      </dl>
      {s && s.activeRoundId !== 0n ? (
        <div className="mt-3">
          <Banner tone="brand" lead={`Round #${s.activeRoundId} is open.`} action={isOwn ? <Link href="/play/" className="btn-primary !px-5 !py-2.5 text-sm">Go to round</Link> : undefined}>
            It counts toward these stats once it settles.
          </Banner>
        </div>
      ) : null}

      <section className="card mt-8 p-3 sm:p-5">
        <p className="eyebrow px-3 pt-2">Recent rounds</p>
        {history.isLoading ? (
          <ul className="mt-4 space-y-2">
            {Array.from({ length: 3 }, (_, i) => <li key={i} className="h-14 animate-pulse rounded-2xl bg-white/60" />)}
          </ul>
        ) : !history.data?.length ? (
          <div className="mt-4 rounded-2xl bg-white/75 px-5 py-8 text-center">
            <p className="text-[0.9375rem] font-bold text-ink">No rounds yet.</p>
            {isOwn ? <Link href="/play/" className="btn-primary mt-5">Start a 60s round</Link> : null}
          </div>
        ) : (
          <ol className="mt-4 space-y-2">
            {history.data.map((r) => {
              const live = !r.finalized && Number(r.endTime) > nowSec
              const status = r.finalized ? 'Settled' : live ? 'Live' : 'Awaiting settle'
              const best = s && s.bestRoundId === r.id && r.finalized
              return (
                <li key={r.id.toString()} className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-ghost">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.875rem] font-bold text-ink">
                      Round #{r.id.toString()}
                      {best ? <span className="ml-2 rounded-full bg-brand-gradient px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.14em] text-white">Best</span> : null}
                    </p>
                    <p className="text-[0.6875rem] text-ink-muted">
                      {new Date(Number(r.startTime) * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} · {r.misses} {r.misses === 1 ? 'miss' : 'misses'} · {status}
                    </p>
                  </div>
                  <span className="tabular text-[1.25rem] font-bold text-ink">{r.score}</span>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {isOwn && gate.address ? <SessionFloat player={gate.address} canSweep={gate.state === 'ready' && s?.activeRoundId === 0n} /> : null}
    </div>
  )
}

function Stat({ label, value, strong }: { label: string; value?: string; strong?: boolean }) {
  return (
    <div className="card-sm flex flex-col-reverse gap-1 p-5">
      <dt className="text-[0.6875rem] text-ink-muted">{label}</dt>
      <dd className={`tabular font-bold tracking-[-0.03em] ${strong ? 'text-[2rem] text-brand-600' : 'text-[1.5rem] text-ink'}`}>
        {value ?? <span className="inline-block h-7 w-12 animate-pulse rounded-lg bg-white/70" />}
      </dd>
    </div>
  )
}

/** Shows the browser's session key and lets the player pull any leftover gas float back. */
function SessionFloat({ player, canSweep }: { player: Address; canSweep: boolean }) {
  const account = typeof window !== 'undefined' ? loadSessionAccount(player) : null
  const balance = useBalance(account?.address)
  const qc = useQueryClient()
  const [state, setState] = useState<{ busy: boolean; msg?: string; hash?: string; error?: string }>({ busy: false })
  if (!account) return null

  const sweep = async () => {
    setState({ busy: true })
    try {
      const sender = new SessionSender(account, await publicClient.getGasPrice())
      const out = await sender.sweepTo(player)
      if (!out) {
        setState({ busy: false, msg: 'Nothing worth returning - the balance would not cover the transfer fee.' })
        return
      }
      const receipt = await publicClient.waitForTransactionReceipt({ hash: out.hash, pollingInterval: 200 })
      if (receipt.status !== 'success') throw new Error('Transfer reverted')
      setState({ busy: false, msg: `Returned ${formatBot(out.value)} ${SYMBOL_NAME} to your wallet.`, hash: out.hash })
      void qc.invalidateQueries({ queryKey: ['balance'] })
    } catch (err) {
      setState({ busy: false, error: explainError(err) })
    }
  }

  const bal = balance.data
  return (
    <section className="card-sm mt-6 p-5">
      <div className="flex items-start gap-3">
        <span className="chip"><IconKey /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-bold text-ink">Session key in this browser</p>
          <p className="mt-0.5 break-all font-mono text-[0.6875rem] text-ink-soft">{account.address}</p>
          <p className="mt-2 text-[0.8125rem] text-ink-muted">
            Gas float held: <span className="font-bold text-ink">{bal === undefined ? '…' : `${formatBot(bal)} ${SYMBOL_NAME}`}</span>. It can only
            submit taps for rounds you named it in; the float returns automatically after each round.
          </p>
          {bal !== undefined && bal > 0n ? (
            <button type="button" className="btn-ghost mt-4 !px-5 !py-2.5 text-sm" onClick={sweep} disabled={state.busy || !canSweep}>
              {state.busy ? 'Returning…' : 'Return float to wallet'}
            </button>
          ) : null}
          {!canSweep && bal !== undefined && bal > 0n ? <p className="mt-2 text-[0.6875rem] text-ink-muted">Available when no round is open and your wallet is on BOT Chain.</p> : null}
          {state.msg ? (
            <p className="mt-2 text-[0.75rem] text-ink-muted" role="status">
              {state.msg}{' '}
              {state.hash && explorerTx(state.hash) ? <a className="text-brand-600 underline" href={explorerTx(state.hash)} target="_blank" rel="noreferrer">View</a> : null}
            </p>
          ) : null}
          {state.error ? <p className="mt-2 text-[0.75rem] font-semibold text-rose-700" role="alert">{state.error}</p> : null}
        </div>
      </div>
    </section>
  )
}
