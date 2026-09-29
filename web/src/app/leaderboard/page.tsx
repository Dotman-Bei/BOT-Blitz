'use client'

import Link from 'next/link'
import { Banner } from '@/components/Banner'
import { useMounted } from '@/components/ConnectButton'
import { IconLink } from '@/components/Icons'
import { useAccount } from 'wagmi'
import { BLITZ_ADDRESS, explorerAddress, IS_CONFIGURED } from '@/lib/chain'
import { shortAddress } from '@/lib/format'
import { useLeaderboard, usePlayerStats } from '@/lib/reads'

export default function LeaderboardPage() {
  const mounted = useMounted()
  const { address } = useAccount()
  const board = useLeaderboard()
  const me = usePlayerStats(mounted ? address : undefined)
  const rows = board.data ?? []
  const mine = address ? rows.find((r) => r.player.toLowerCase() === address.toLowerCase()) : undefined
  const contractUrl = BLITZ_ADDRESS ? explorerAddress(BLITZ_ADDRESS) : undefined

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <p className="eyebrow">Top 20 · stored on-chain</p>
      <h1 className="mt-4 text-[1.875rem] leading-[1.1] sm:text-[2.25rem]">The board.</h1>
      <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
        Ranked by best verified score. The contract keeps this list sorted as rounds settle; this page just reads it.
        Ties go to whoever got there first.
      </p>
      {contractUrl ? (
        <a href={contractUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 font-mono text-[0.75rem] text-brand-600 hover:underline">
          Verify on BOTScan <IconLink width={13} height={13} />
        </a>
      ) : null}

      <div className="mt-8 space-y-3">
        {!IS_CONFIGURED ? (
          <Banner tone="notice" lead="Not deployed yet.">This build has no contract address, so there is no board to read.</Banner>
        ) : board.isError ? (
          <Banner
            tone="error"
            lead="Could not read the board."
            action={<button className="btn-ghost !px-5 !py-2 text-sm" onClick={() => board.refetch()}>Try again</button>}
          >
            The BOT Chain RPC did not answer. Nothing is shown rather than something stale.
          </Banner>
        ) : null}

        {mounted && address && me.data && me.data.bestScore > 0n && !mine && !board.isLoading ? (
          <Banner tone="brand" lead={`Your best is ${me.data.bestScore}.`}>
            Beat #{rows.length ? rows[rows.length - 1].rank : 20}&apos;s {rows.length ? rows[rows.length - 1].score.toString() : ''} to make the board.
          </Banner>
        ) : null}

        <div className="card p-3 sm:p-5">
          <div className="grid grid-cols-[2.5rem_1fr_auto] gap-3 px-3 pb-3 text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft sm:grid-cols-[3rem_1fr_6rem_5rem]">
            <span>Rank</span>
            <span>Player</span>
            <span className="hidden text-right sm:block">Best round</span>
            <span className="text-right">Score</span>
          </div>

          {board.isLoading ? (
            <ul className="space-y-2" aria-label="Loading leaderboard">
              {Array.from({ length: 5 }, (_, i) => (
                <li key={i} className="h-[3.25rem] animate-pulse rounded-2xl bg-white/60" />
              ))}
            </ul>
          ) : rows.length === 0 && IS_CONFIGURED && !board.isError ? (
            <div className="rounded-2xl bg-white/75 px-5 py-10 text-center">
              <p className="text-[0.9375rem] font-bold text-ink">No settled rounds yet.</p>
              <p className="mt-1 text-[0.8125rem] text-ink-muted">The first round that scores takes #1.</p>
              <Link href="/play/" className="btn-primary mt-5">Start a 60s round</Link>
            </div>
          ) : (
            <ol className="space-y-2">
              {rows.map((r) => {
                const isMe = address && r.player.toLowerCase() === address.toLowerCase()
                return (
                  <li
                    key={r.player}
                    className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-2xl px-3 py-2.5 sm:grid-cols-[3rem_1fr_6rem_5rem] ${
                      isMe ? 'bg-white shadow-card ring-1 ring-brand-300' : 'bg-white/75 shadow-ghost'
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-[0.75rem] font-bold ${
                        r.rank <= 3 ? 'bg-brand-gradient text-white shadow-brand' : 'bg-brand-50 text-brand-600'
                      }`}
                    >
                      {r.rank}
                    </span>
                    <Link
                      href={`/profile/?address=${r.player}`}
                      title={r.player}
                      className="min-w-0 truncate font-mono text-[0.8125rem] text-ink hover:text-brand-600"
                    >
                      {shortAddress(r.player)}
                      {isMe ? <span className="ml-2 font-sans text-[0.625rem] font-bold uppercase tracking-[0.14em] text-brand-600">You</span> : null}
                    </Link>
                    <span className="tabular hidden text-right font-mono text-[0.75rem] text-ink-muted sm:block">#{r.roundId.toString()}</span>
                    <span className="tabular text-right text-[1.125rem] font-bold text-ink">{r.score.toString()}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
        <p className="px-2 text-[0.6875rem] text-ink-muted">Refreshes every 10 seconds from the contract.</p>
      </div>
    </div>
  )
}
