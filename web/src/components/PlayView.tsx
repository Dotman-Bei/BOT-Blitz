'use client'

import Link from 'next/link'
import { useEffect, useRef, type ReactNode } from 'react'
import { Banner } from './Banner'
import { BlitzMark } from './BlitzMark'
import { useConnectWallet } from './ConnectButton'
import { GameGrid } from './GameGrid'
import { IconCheck, IconKey, IconTrophy } from './Icons'
import { TimerRing } from './TimerRing'
import { TxLog } from './TxLog'
import { GateBanner, useSwitchToBot, type GateState } from './WalletGate'
import { CHAIN_LABEL, FAUCET_URL } from '@/lib/chain'
import { formatSeconds } from '@/lib/format'
import type { TxEntry, useBlitzGame } from '@/lib/useBlitzGame'

export type Game = ReturnType<typeof useBlitzGame>

/** The whole /play screen for a given wallet gate and game state. Stateless, so it can be previewed. */
export function PlayView({ gate, game, best }: { gate: GateState; game: Game; best?: number }) {
  return (
    <div className="mx-auto max-w-md px-2.5 pb-44 pt-6 sm:px-4 short:max-w-2xl short:pb-8 short:pt-3 md:max-w-xl lg:max-w-5xl lg:pb-16 lg:pt-10">
      <div className="lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-6">
        <div className="space-y-3">
          {gate !== 'ready' && gate !== 'loading' ? <GateBanner state={gate} /> : null}
          {game.error ? (
            <Banner tone="error" lead="Heads up.">
              {game.error}
              {/Not enough BOT/.test(game.error) && FAUCET_URL ? (
                <>
                  {' '}
                  <a className="font-semibold text-brand-600 underline" href={FAUCET_URL} target="_blank" rel="noreferrer">
                    Get test BOT from the faucet
                  </a>
                  .
                </>
              ) : null}
            </Banner>
          ) : null}

          <section className="card p-5 sm:p-7" aria-live="polite">
            {gate !== 'ready' || game.phase === 'loading' ? (
              <Waiting gateLoading={gate === 'loading' || (gate === 'ready' && game.phase === 'loading')} />
            ) : game.phase === 'idle' ? (
              <Idle game={game} best={best} />
            ) : game.phase === 'starting' ? (
              <Stages title="Starting your round" entry={game.log.find((e) => e.kind === 'start')} />
            ) : game.phase === 'live' && game.round ? (
              <Live game={game} />
            ) : game.phase === 'settling' ? (
              <Settling game={game} />
            ) : game.phase === 'done' && game.result ? (
              <Result game={game} />
            ) : (
              <Waiting gateLoading />
            )}
            <div className="mt-6 hidden lg:block">
              <PrimaryAction gate={gate} game={game} />
            </div>
          </section>
        </div>

        <aside className="mt-3 space-y-3 lg:sticky lg:top-28 lg:mt-0">
          <div className="card-sm p-5">
            <p className="eyebrow">This round on-chain</p>
            <dl className="mt-4 grid grid-cols-3 gap-3">
              <Metric label="Last confirm" value={game.lastLatencyMs ? formatSeconds(game.lastLatencyMs) : '-'} />
              <Metric label="Avg confirm" value={game.avgLatencyMs ? formatSeconds(game.avgLatencyMs) : '-'} />
              <Metric label="Taps sent" value={String(game.confirmedTaps)} />
            </dl>
            <p className="mt-3 text-[0.6875rem] text-ink-muted">Tap to receipt, measured in your browser.</p>
          </div>
          <div className="card-sm p-3">
            <p className="eyebrow px-2 pb-3 pt-2">Transactions</p>
            <TxLog entries={game.log} />
          </div>
        </aside>
      </div>

      {/* Primary action pinned under the thumb on phones. */}
      <div className={`glass-bar fixed inset-x-0 bottom-0 z-30 border-t pb-safe pt-3 lg:hidden ${game.phase === 'live' ? 'short:hidden' : ''}`}>
        <div className="mx-auto max-w-md px-4 md:max-w-xl">
          <PrimaryAction gate={gate} game={game} />
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-[0.625rem] text-ink-muted">{label}</dt>
      <dd className="tabular text-[1.0625rem] font-bold text-ink">{value}</dd>
    </div>
  )
}

function Waiting({ gateLoading }: { gateLoading: boolean }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <BlitzMark className="h-12 w-12" framed={gateLoading} />
      <p className="eyebrow mt-6">Blitz Round</p>
      <h1 className="mt-3 text-[1.75rem] leading-tight">{gateLoading ? 'Reading the chain…' : 'Connect to play.'}</h1>
      <p className="mt-2 max-w-xs text-[0.8125rem] leading-relaxed text-ink-muted">
        {gateLoading
          ? 'Checking your wallet and any round you already have open.'
          : `Your wallet is your player. Rounds, scores and the board all live on ${CHAIN_LABEL}.`}
      </p>
    </div>
  )
}

function Idle({ game, best }: { game: Game; best?: number }) {
  return (
    <div>
      <p className="eyebrow">Blitz Round</p>
      <h1 className="mt-3 text-[1.75rem] leading-tight">Ready when you are.</h1>
      <ul className="mt-5 space-y-2 text-[0.8125rem] leading-relaxed text-ink-muted">
        <li className="flex gap-2"><IconCheck className="mt-0.5 shrink-0 text-brand-500" /> 60 seconds from the block that starts your round.</li>
        <li className="flex gap-2"><IconCheck className="mt-0.5 shrink-0 text-brand-500" /> Tap the lit cell: +1. Anything else is a miss.</li>
        <li className="flex gap-2"><IconCheck className="mt-0.5 shrink-0 text-brand-500" /> The next cell lights only after the chain confirms.</li>
      </ul>

      <fieldset className="mt-6">
        <legend className="text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">How taps are signed</legend>
        <div role="radiogroup" aria-label="How taps are signed" className="mt-2 grid gap-2">
          <ModeOption
            checked={game.preferSession}
            onSelect={() => game.setPreferSession(true)}
            title="Quick play"
            note="One approval. A session key signs taps and returns its gas float when the round settles."
          />
          <ModeOption
            checked={!game.preferSession}
            onSelect={() => game.setPreferSession(false)}
            title="Sign every tap"
            note="Every tap opens your wallet. Slower, but nothing is delegated."
          />
        </div>
      </fieldset>

      {best !== undefined ? (
        <p className="mt-5 flex items-center gap-2 text-[0.8125rem] text-ink-muted">
          <IconTrophy className="text-brand-500" /> Your best on-chain: <span className="font-bold text-ink">{best}</span>
        </p>
      ) : null}
    </div>
  )
}

function ModeOption({ checked, onSelect, title, note }: { checked: boolean; onSelect: () => void; title: string; note: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
        checked ? 'border-brand-300 bg-white shadow-card' : 'border-white bg-white/65 shadow-ghost'
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${checked ? 'bg-brand-gradient text-white shadow-brand' : 'border border-brand-200 bg-white'}`}
      >
        {checked ? <IconCheck width={12} height={12} strokeWidth={2.4} /> : null}
      </span>
      <span>
        <span className="block text-[0.9375rem] font-bold text-ink">{title}</span>
        <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-ink-muted">{note}</span>
      </span>
    </button>
  )
}

/** Real stages of the transaction, never a fake percentage. */
function Stages({ title, entry }: { title: string; entry?: TxEntry }) {
  const status = entry?.status ?? 'requested'
  const stages: { label: string; note: string; done: boolean; active: boolean }[] = [
    { label: 'Approve in your wallet', note: 'Nothing is sent until you approve.', done: status !== 'requested', active: status === 'requested' },
    { label: 'Waiting for a block', note: 'Your transaction is broadcast.', done: status === 'confirmed', active: status === 'pending' },
    { label: 'Round live', note: 'The contract has lit your first cell.', done: false, active: status === 'confirmed' },
  ]
  return (
    <div role="status">
      <div className="flex items-center gap-3">
        <BlitzMark className="h-10 w-10" framed />
        <div>
          <p className="eyebrow">Please wait</p>
          <h1 className="mt-2 text-[1.5rem] leading-tight">{title}</h1>
        </div>
      </div>
      <ol className="mt-6 space-y-2">
        {stages.map((s) => (
          <StageRow key={s.label} {...s} />
        ))}
      </ol>
    </div>
  )
}

function StageRow({ label, note, done, active }: { label: string; note: string; done: boolean; active: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-2xl p-3.5 ${active ? 'bg-white shadow-ghost' : 'bg-white/55'}`}>
      <span className="grid h-7 w-7 shrink-0 place-items-center">
        {done ? (
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-gradient text-white shadow-brand">
            <IconCheck width={13} height={13} strokeWidth={2.4} />
          </span>
        ) : active ? (
          <span className="spin h-6 w-6 rounded-full border-[2.5px] border-brand-200 border-t-brand-500" />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-brand-200" />
        )}
      </span>
      <div>
        <p className={`text-[0.875rem] font-bold ${active || done ? 'text-ink' : 'text-ink-muted'}`}>{label}</p>
        <p className="text-[0.6875rem] text-ink-muted">{note}</p>
      </div>
    </li>
  )
}

function Live({ game }: { game: Game }) {
  const r = game.round!
  const expired = game.timeLeftMs <= 0
  const ref = useRef<HTMLDivElement>(null)
  // On landscape phones the header scrolls away instead of sticking; bring the board fully into view.
  useEffect(() => {
    if (window.matchMedia('(max-height: 500px) and (orientation: landscape)').matches) {
      ref.current?.closest('section')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }, [])
  return (
    <div ref={ref} className="short:flex short:items-center short:gap-6">
      <div className="flex items-center justify-between gap-4 short:w-44 short:shrink-0 short:flex-col short:items-start">
        <div>
          <p className="eyebrow">Round #{r.id.toString()}</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="tabular text-[2.75rem] font-bold leading-none tracking-[-0.04em] text-ink">{r.score}</span>
            <span className="text-[0.6875rem] text-ink-muted">verified</span>
          </p>
          <p className="mt-1 text-[0.6875rem] text-ink-muted">
            {r.misses} {r.misses === 1 ? 'miss' : 'misses'} · step {r.step + 1}
          </p>
        </div>
        <TimerRing msLeft={game.timeLeftMs} />
      </div>

      {/* Square board sized by the smaller of width and remaining viewport height, so the whole
          board, score and timer fit on one screen on laptops and landscape phones too. */}
      <div className="mx-auto mt-5 w-full max-w-[clamp(15rem,calc(100dvh-21rem),100%)] short:mt-0 short:max-w-[clamp(12rem,calc(100dvh-4rem),100%)]">
        <GameGrid
          target={r.target}
          pendingCell={game.pendingCell}
          flash={game.flash}
          disabled={expired || game.pendingCell !== null}
          onTap={game.tap}
        />
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[0.6875rem] text-ink-muted short:hidden">
        {game.mode === 'session' ? (
          <>
            <IconKey width={13} height={13} /> Session key signing · one tap per block
          </>
        ) : (
          'Each tap opens your wallet · one tap per block'
        )}
      </p>
    </div>
  )
}

function Settling({ game }: { game: Game }) {
  const fin = game.log.find((e) => e.kind === 'finalize')
  const stages = [
    { label: 'Window closed', note: 'No more taps can score. Your score is fixed.', done: true, active: false },
    {
      label: 'Recording on-chain',
      note: 'Updates your stats, personal best and the board.',
      done: fin?.status === 'confirmed',
      active: !game.needsManualSettle && fin?.status !== 'confirmed',
    },
  ]
  return (
    <div role="status">
      <div className="flex items-center gap-3">
        <BlitzMark className="h-10 w-10" framed={!game.needsManualSettle} />
        <div>
          <p className="eyebrow">Time</p>
          <h1 className="mt-2 text-[1.5rem] leading-tight">
            {game.round ? `${game.round.score} verified. Settling…` : 'Settling…'}
          </h1>
        </div>
      </div>
      <ol className="mt-6 space-y-2">
        {stages.map((s) => (
          <StageRow key={s.label} {...s} />
        ))}
      </ol>
      {game.needsManualSettle ? (
        <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-muted">
          One more approval records the round. If you skip it, your next round settles this one automatically - the
          score can't change either way.
        </p>
      ) : null}
    </div>
  )
}

function Result({ game }: { game: Game }) {
  const res = game.result!
  const attempts = res.score + res.misses
  const accuracy = attempts ? Math.round((res.score / attempts) * 100) : 0
  return (
    <div>
      <p className="eyebrow">Round #{res.roundId.toString()} · settled</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] leading-tight">{res.isNewBest ? 'New personal best.' : 'Round complete.'}</h1>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">Read back from the contract, not this page.</p>
        </div>
        {res.isNewBest ? (
          <span className="rounded-full bg-brand-gradient px-3 py-1.5 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-white shadow-brand">
            Best
          </span>
        ) : null}
      </div>

      <div className="mt-6 rounded-panel bg-white/85 p-6 text-center shadow-ghost">
        <p className="text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">Verified score</p>
        <p className="tabular mt-1 text-[4rem] font-bold leading-none tracking-[-0.05em] text-ink">{res.score}</p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ResultTile label="Misses" value={String(res.misses)} />
        <ResultTile label="Accuracy" value={`${accuracy}%`} />
        <ResultTile label="Your best" value={String(res.bestScore)} />
        <ResultTile label="Board rank" value={res.rank ? `#${res.rank}` : 'Top 20 only'} />
      </dl>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[0.8125rem] font-semibold">
        <Link className="text-brand-600 underline-offset-4 hover:underline" href="/leaderboard/">
          View leaderboard
        </Link>
        <Link className="text-brand-600 underline-offset-4 hover:underline" href="/profile/">
          Your profile
        </Link>
      </div>
    </div>
  )
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse gap-0.5 rounded-2xl bg-white/75 px-3.5 py-3 shadow-ghost">
      <dt className="text-[0.625rem] text-ink-muted">{label}</dt>
      <dd className="tabular text-[1.0625rem] font-bold text-ink">{value}</dd>
    </div>
  )
}

function PrimaryAction({ gate, game }: { gate: GateState; game: Game }) {
  const { connectNow, isPending: connecting } = useConnectWallet()
  const { switchNow, isPending: switching } = useSwitchToBot()

  let button: ReactNode = null
  let hint = ''
  if (gate === 'loading') {
    button = <button className="btn-primary w-full" disabled>…</button>
    hint = 'Checking your wallet'
  } else if (gate === 'unconfigured') {
    button = <button className="btn-primary w-full" disabled>Not deployed</button>
    hint = 'This build has no contract address'
  } else if (gate === 'no-wallet') {
    button = <button className="btn-primary w-full" disabled>No wallet found</button>
    hint = 'Install an EVM wallet to play'
  } else if (gate === 'disconnected') {
    button = (
      <button className="btn-primary w-full" onClick={connectNow} disabled={connecting}>
        {connecting ? 'Check your wallet…' : 'Connect wallet'}
      </button>
    )
    hint = 'Your address is your player'
  } else if (gate === 'wrong-network') {
    button = (
      <button className="btn-primary w-full" onClick={switchNow} disabled={switching}>
        {switching ? 'Check your wallet…' : `Switch to ${CHAIN_LABEL}`}
      </button>
    )
    hint = 'Rounds only run on BOT Chain'
  } else if (game.phase === 'loading') {
    button = <button className="btn-primary w-full" disabled>…</button>
    hint = 'Looking for an open round'
  } else if (game.phase === 'idle') {
    button = (
      <button className="btn-primary w-full" onClick={game.start}>
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden="true" />
        Start a 60s round
      </button>
    )
    hint = game.preferSession ? 'One approval · gas float returned after the round' : 'Every tap will open your wallet'
  } else if (game.phase === 'starting') {
    const s = game.log.find((e) => e.kind === 'start')?.status
    button = <button className="btn-primary w-full" disabled>{s === 'pending' ? 'Waiting for a block…' : 'Approve in your wallet…'}</button>
    hint = 'Nothing is sent until you approve'
  } else if (game.phase === 'live') {
    button = (
      <div className="flex h-[3.25rem] items-center justify-center rounded-full bg-white/70 text-[0.9375rem] font-semibold text-ink shadow-ghost">
        {game.pendingCell !== null ? 'Confirming on-chain…' : 'Tap the lit cell'}
      </div>
    )
    hint = 'Keys 1-9 work too'
  } else if (game.phase === 'settling') {
    button = game.needsManualSettle ? (
      <button className="btn-primary w-full" onClick={() => game.settle(true)}>
        Record my score
      </button>
    ) : (
      <button className="btn-primary w-full" disabled>Settling on-chain…</button>
    )
    hint = game.needsManualSettle ? 'One wallet approval' : 'Your score is already fixed'
  } else if (game.phase === 'done') {
    button = (
      <button className="btn-primary w-full" onClick={game.start}>
        Play again
      </button>
    )
    hint = 'A new 60-second round'
  }

  return (
    <div>
      {button}
      {hint ? <p className="mt-2 text-center text-[0.6875rem] text-ink-muted">{hint}</p> : null}
    </div>
  )
}

