import Link from 'next/link'
import { HeroDemo } from '@/components/HeroDemo'
import { IconBolt, IconShield, IconTimer, IconTrophy } from '@/components/Icons'
import { StatStrip } from '@/components/StatStrip'

const features = [
  {
    icon: <IconBolt />,
    title: 'Every tap is a transaction',
    body: "Each tap calls the contract. There's no off-chain game to play first and submit a score for later.",
  },
  {
    icon: <IconShield />,
    title: 'The contract keeps score',
    body: 'You send a cell, never a number. The contract checks it against the lit target and adds the point itself.',
  },
  {
    icon: <IconTimer />,
    title: 'Sixty seconds, hard stop',
    body: 'The window is fixed by the block that starts your round. After it closes, the contract rejects every tap.',
  },
  {
    icon: <IconTrophy />,
    title: 'A board anyone can check',
    body: 'Best scores and the round they came from live in contract storage. Nothing on the board comes from this website.',
  },
]

const steps = [
  { n: '01', title: 'Connect', body: 'Your wallet address is your player. No account, no password.' },
  {
    n: '02',
    title: 'Start',
    body: 'One approval starts the round and hands a short-lived session key a small gas float, so taps need no popups.',
  },
  { n: '03', title: 'Tap', body: 'Tap the lit cell. Each tap is signed, sent and confirmed before the next cell lights.' },
  { n: '04', title: 'Settle', body: 'At zero the round is settled on-chain, your best and the board update, and the float comes back.' },
]

const checks = [
  { name: 'Owner', note: 'The caller is the player, or the session key named for this round only.' },
  { name: 'Window', note: "The block's timestamp is before the round's end. At 60 seconds, taps revert." },
  { name: 'Step', note: 'The tap answers the current step. A step that already scored cannot score again.' },
  { name: 'Pace', note: 'One tap per block per round, so no client can outrun the chain.' },
  { name: 'Cell', note: 'Matches the lit target: +1 and the next cell lights. Anything else is a miss.' },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* hero */}
      <section className="grid items-center gap-12 pb-14 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pt-20">
        <div className="animate-fade-up">
          <p className="eyebrow">Blitz Round · on BOT Chain</p>
          <h1 className="mt-5 text-[2.5rem] leading-[1.05] text-ink sm:text-5xl lg:text-[3.5rem]">
            Sixty seconds.{' '}
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              Every tap on-chain.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg font-medium text-ink/80">
            The contract lights a cell. You tap it. BOT Chain confirms the transaction, adds your point and lights the
            next one - so your score is only as fast as the chain.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/play/" className="btn-primary">
              Start a 60s round
            </Link>
            <Link href="/leaderboard/" className="btn-ghost">
              See the leaderboard
            </Link>
          </div>
          <p className="mt-4 text-[0.6875rem] text-ink-muted">Free to play - you only pay gas. No token, no entry fee.</p>
        </div>
        <div className="animate-fade-up [animation-delay:120ms]">
          <HeroDemo />
        </div>
      </section>

      <section aria-label="Live chain stats">
        <StatStrip />
      </section>

      {/* features */}
      <section className="mt-24">
        <p className="eyebrow">Why it's on-chain</p>
        <h2 className="mt-4 max-w-2xl text-[1.875rem] leading-[1.1] sm:text-[2.25rem]">
          The blockchain isn't behind the game. It is the game.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card-sm p-6">
              <span className="chip">{f.icon}</span>
              <h3 className="mt-5 text-[0.9375rem] font-bold tracking-normal text-ink">{f.title}</h3>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* steps */}
      <section className="mt-24">
        <p className="eyebrow">How a round works</p>
        <h2 className="mt-4 text-[1.875rem] leading-[1.1] sm:text-[2.25rem]">Connect, start, tap, settle.</h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="card-sm relative overflow-hidden p-6 pt-8">
              <span aria-hidden="true" className="absolute right-5 top-3 text-[2.75rem] font-bold tracking-[-0.04em] text-brand-200">
                {s.n}
              </span>
              <h3 className="text-[0.9375rem] font-bold tracking-normal text-ink">{s.title}</h3>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* contract checks */}
      <section className="mt-24 grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-28">
          <p className="eyebrow">Trust, as mechanism</p>
          <h2 className="mt-4 text-[1.875rem] leading-[1.1] sm:text-[2.25rem]">We never take the app's word for it.</h2>
          <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
            This website only draws the grid. Every rule that decides a point runs inside the BOTBlitz contract, on
            every tap, before anything is written. Refresh mid-round and the game picks up from the chain.
          </p>
        </div>
        <div className="card p-4 sm:p-6">
          <p className="eyebrow px-2 pt-2">Checked on every tap</p>
          <ol className="mt-5 space-y-2.5">
            {checks.map((c, i) => (
              <li key={c.name} className="flex items-start gap-3.5 rounded-2xl bg-white/85 p-4 shadow-ghost">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-[0.6875rem] font-bold text-white shadow-brand">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[0.9375rem] font-bold text-ink">{c.name}</p>
                  <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-muted">{c.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* closing */}
      <section className="card mt-24 px-6 py-14 text-center sm:px-12">
        <p className="eyebrow">One round · 60 seconds</p>
        <h2 className="mx-auto mt-4 max-w-xl text-[1.875rem] leading-[1.1] sm:text-[2.25rem]">
          Sixty seconds is enough to find out.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
          Connect, approve once, and tap. Your best round goes on the board for anyone to verify.
        </p>
        <Link href="/play/" className="btn-primary mt-8 w-full sm:w-auto">
          Start a 60s round
        </Link>
      </section>
    </div>
  )
}
