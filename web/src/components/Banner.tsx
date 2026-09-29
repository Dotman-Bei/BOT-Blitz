import type { ReactNode } from 'react'
import { IconAlert, IconBolt } from './Icons'

type Tone = 'info' | 'notice' | 'error' | 'brand'

const surface: Record<Tone, string> = {
  info: '',
  notice: '!bg-amber-50/85 !border-amber-100',
  error: '!bg-rose-50/90 !border-rose-100',
  brand: '!bg-brand-50/90 !border-brand-100',
}
const chipTone: Record<Tone, string> = {
  info: '',
  notice: '!text-amber-700',
  error: '!text-rose-700',
  brand: '',
}

/** card-sm with a chip and a bold lead phrase. Errors announce themselves. */
export function Banner({
  tone = 'info',
  lead,
  children,
  action,
  icon,
}: {
  tone?: Tone
  lead: string
  children?: ReactNode
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`card-sm flex items-start gap-3 p-3.5 ${surface[tone]}`}>
      <span className={`chip ${chipTone[tone]}`}>{icon ?? (tone === 'error' || tone === 'notice' ? <IconAlert /> : <IconBolt />)}</span>
      <div className="min-w-0 flex-1 pt-0.5 text-xs leading-relaxed text-ink-muted">
        <span className={`font-bold ${tone === 'error' ? 'text-rose-800' : 'text-ink'}`}>{lead}</span>
        {children ? <> {children}</> : null}
        {action ? <div className="mt-2.5 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  )
}
