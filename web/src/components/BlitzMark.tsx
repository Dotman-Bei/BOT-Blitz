import { BOARD_CELLS, CELL, LIT_CELL, LOCKUP, WORDMARK } from './logoData'

/*
 * The BOT Blitz mark: the game's 3x3 board with the lit cell popped up and right out of its slot -
 * a tap, confirmed. Flat colour only: board in currentColor (ink by default), lit cell in brand indigo.
 * Geometry comes from logoData.ts, generated alongside the files in /brand, so they never drift.
 */

function Cells() {
  return (
    <>
      {BOARD_CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={CELL.size} height={CELL.size} rx={CELL.radius} fill="currentColor" />
      ))}
    </>
  )
}

/**
 * @param pending  While a transaction waits, the lit cell settles back into its slot and pops out
 *                 again - the mark acts out "waiting for confirmation".
 */
export function BlitzMark({ className = 'h-8 w-8', framed: pending = false }: { className?: string; framed?: boolean }) {
  const dx = LIT_CELL.slotX - LIT_CELL.x
  const dy = LIT_CELL.slotY - LIT_CELL.y
  return (
    <svg viewBox="0 0 48 48" className={`text-ink ${className}`} aria-hidden="true">
      <Cells />
      <rect
        x={LIT_CELL.x}
        y={LIT_CELL.y}
        width={CELL.size}
        height={CELL.size}
        rx={CELL.radius}
        className={`fill-brand-500 ${pending ? 'motion-safe:animate-[bb-pop_1.4s_cubic-bezier(0.65,0,0.35,1)_infinite]' : ''}`}
      />
      {pending ? <style>{`@keyframes bb-pop{0%,100%{transform:translate(0,0)}45%,55%{transform:translate(${dx}px,${dy}px)}}`}</style> : null}
    </svg>
  )
}

/** Horizontal lockup: mark + outlined wordmark (Plus Jakarta Sans Bold, square i-dot as a lit cell). */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox={LOCKUP.viewBox}
      className={`h-7 w-auto shrink-0 text-ink xs:h-8 sm:h-9 ${className}`}
      role="img"
      aria-label="BOT Blitz"
    >
      <g transform={LOCKUP.markTransform}>
        <Cells />
        <rect x={LIT_CELL.x} y={LIT_CELL.y} width={CELL.size} height={CELL.size} rx={CELL.radius} className="fill-brand-500" />
      </g>
      <g transform={LOCKUP.wordTransform}>
        <path d={WORDMARK.path} fill="currentColor" />
        <rect x={WORDMARK.dot.x} y={WORDMARK.dot.y} width={WORDMARK.dot.size} height={WORDMARK.dot.size} rx={WORDMARK.dot.rx} className="fill-brand-500" />
      </g>
    </svg>
  )
}
