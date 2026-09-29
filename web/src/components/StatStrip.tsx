'use client'

import { IS_CONFIGURED, SYMBOL_NAME } from '@/lib/chain'
import { formatCount } from '@/lib/format'
import { useChainPulse, useGlobalStats } from '@/lib/reads'
import { formatEther } from 'viem'

// Typical submitAction gas from `forge test --gas-report` (median 38,484).
const TAP_GAS = 38_484n

export function StatStrip() {
  const stats = useGlobalStats()
  const pulse = useChainPulse()

  const tapCost = pulse.data ? Number(formatEther(pulse.data.gasPrice * TAP_GAS)) : undefined
  const items = [
    { label: 'Players', value: IS_CONFIGURED ? formatCount(stats.data?.players) : '-' },
    { label: 'Rounds played', value: IS_CONFIGURED ? formatCount(stats.data?.roundsStarted) : '-' },
    {
      label: 'Block time, last 100',
      value: pulse.data ? `${(pulse.data.blockTimeMs / 1000).toFixed(2)}s` : '-',
    },
    {
      label: 'Gas per tap, live',
      value: tapCost !== undefined ? `${tapCost.toPrecision(2)} ${SYMBOL_NAME}` : '-',
    },
  ]

  return (
    <div className="rounded-3xl border border-white bg-white/60 px-5 py-5 shadow-lift backdrop-blur-lg sm:px-8">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 xs:gap-x-6 md:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="flex min-w-0 flex-col-reverse gap-1">
            <dt className="text-[0.6875rem] text-ink-muted">{it.label}</dt>
            <dd className="tabular whitespace-nowrap text-[1.125rem] font-bold tracking-[-0.03em] text-ink xs:text-[1.3125rem] sm:text-[1.5rem] md:text-[1.3125rem] lg:text-[1.5rem]">
              {it.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[0.6875rem] text-ink-muted">
        Measured from the chain as you read this{pulse.data ? ` · block ${pulse.data.blockNumber.toLocaleString('en-US')}` : ''}.
        {pulse.isError ? ' The RPC did not answer; retrying.' : ''}
      </p>
    </div>
  )
}
