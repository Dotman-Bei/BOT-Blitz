export function TimerRing({ msLeft, total = 60_000 }: { msLeft: number; total?: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, msLeft / total))
  const secs = Math.ceil(msLeft / 1000)
  const low = secs <= 10
  return (
    <div className="relative h-16 w-16 shrink-0" role="timer" aria-label={`${secs} seconds left`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={low ? '#E11D48' : 'url(#tr-g)'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
        <defs>
          <linearGradient id="tr-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5C7DE2" />
            <stop offset="1" stopColor="#2948B5" />
          </linearGradient>
        </defs>
      </svg>
      <span className={`tabular absolute inset-0 grid place-items-center text-lg font-bold ${low ? 'text-rose-700' : 'text-ink'}`}>
        {secs}
      </span>
    </div>
  )
}
