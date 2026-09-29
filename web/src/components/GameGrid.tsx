'use client'

import { useEffect } from 'react'
import type { Flash } from '@/lib/useBlitzGame'

/**
 * The 3x3 board. Only the lit cell comes from the chain; everything else is presentation.
 * Keys 1-9 map to cells left-to-right, top-to-bottom for fast desktop play.
 */
export function GameGrid({
  target,
  pendingCell,
  flash,
  disabled,
  onTap,
}: {
  target: number | null
  pendingCell: number | null
  flash: Flash | null
  disabled: boolean
  onTap: (cell: number) => void
}) {
  useEffect(() => {
    if (disabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= 9) {
        e.preventDefault()
        onTap(n - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [disabled, onTap])

  return (
    <div role="group" aria-label="Blitz grid. Tap the lit cell, or press 1 to 9." className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {Array.from({ length: 9 }, (_, i) => {
        const lit = target === i
        const pending = pendingCell === i
        const fx = flash && flash.cell === i ? (flash.correct ? 'cell-hit' : 'cell-miss') : ''
        return (
          <button
            key={`${i}-${fx ? flash!.key : 0}`}
            type="button"
            disabled={disabled}
            onClick={() => onTap(i)}
            aria-label={`Cell ${i + 1}${lit ? ', lit target' : ''}${pending ? ', confirming' : ''}`}
            className={`relative aspect-square rounded-2xl border transition-[background,box-shadow,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed ${fx} ${
              lit
                ? 'border-white/60 bg-brand-gradient shadow-brand'
                : 'border-white bg-white/60 shadow-ghost hover:bg-white/80'
            } ${disabled && !lit && !pending ? 'opacity-70' : ''}`}
          >
            <span
              className={`absolute left-2.5 top-2 font-mono text-[0.625rem] ${lit ? 'text-white/85' : 'text-ink-soft'}`}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            {lit ? (
              <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
                <span className="h-3 w-3 rounded-full bg-white/90 shadow-[0_0_0_6px_rgba(255,255,255,0.18)]" />
              </span>
            ) : null}
            {pending ? (
              <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
                <span className={`spin h-8 w-8 rounded-full border-[2.5px] ${lit ? 'border-white/40 border-t-white' : 'border-brand-200 border-t-brand-500'}`} />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
