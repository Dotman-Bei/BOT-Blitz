import { memo } from 'react'
import { explorerTx } from '@/lib/chain'
import { formatSeconds } from '@/lib/format'
import type { TxEntry, TxStatus } from '@/lib/useBlitzGame'
import { IconLink } from './Icons'

const statusLabel: Record<TxStatus, string> = {
  requested: 'In wallet',
  pending: 'Pending',
  confirmed: 'Confirmed',
  failed: 'Failed',
}
const statusTone: Record<TxStatus, string> = {
  requested: 'bg-amber-50 text-amber-800',
  pending: 'bg-brand-50 text-brand-600',
  confirmed: 'bg-emerald-50 text-emerald-800',
  failed: 'bg-rose-50 text-rose-800',
}

/** Every transaction this round, with its own status and measured confirmation time. */
export const TxLog = memo(function TxLog({ entries }: { entries: TxEntry[] }) {
  if (!entries.length) {
    return <p className="rounded-2xl bg-white/70 px-4 py-5 text-center text-[0.8125rem] text-ink-muted">Transactions from this round appear here, each with a link to BOTScan.</p>
  }
  return (
    <ol className="space-y-2" aria-live="polite" aria-relevant="additions text">
      {entries.map((e) => {
        const url = e.hash ? explorerTx(e.hash) : undefined
        return (
          <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-white/80 px-3.5 py-2.5 shadow-ghost">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-bold text-ink">{e.label}</p>
              <p className="truncate text-[0.6875rem] text-ink-soft">
                {e.note ?? (e.hash ? <span className="font-mono">{e.hash.slice(0, 10)}…{e.hash.slice(-6)}</span> : 'Waiting for your approval')}
              </p>
            </div>
            {e.ms !== undefined && e.status === 'confirmed' ? (
              <span className="tabular font-mono text-[0.6875rem] text-ink-muted">{formatSeconds(e.ms)}</span>
            ) : null}
            <span className={`rounded-full px-2.5 py-1 text-[0.625rem] font-bold ${statusTone[e.status]}`}>{statusLabel[e.status]}</span>
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" className="rounded-lg p-1 text-ink-soft hover:text-brand-600">
                <IconLink width={15} height={15} />
                <span className="sr-only">View transaction on BOTScan</span>
              </a>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
})
