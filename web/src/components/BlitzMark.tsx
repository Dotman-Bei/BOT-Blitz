/**
 * Four rounded corner brackets around a bolt, drawn in SVG so it inherits colour and the brackets
 * can animate on their own. In `framed` mode the brackets pull in and out while a transaction waits.
 */
export function BlitzMark({ className = 'h-8 w-8', framed = false }: { className?: string; framed?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" fill="none">
      <defs>
        <linearGradient id="bm-g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5C7DE2" />
          <stop offset="0.5" stopColor="#4262D4" />
          <stop offset="1" stopColor="#2948B5" />
        </linearGradient>
      </defs>
      <g
        stroke="url(#bm-g)"
        strokeWidth="3"
        strokeLinecap="round"
        className={framed ? 'origin-center motion-safe:animate-[bm-frame_2.2s_ease-in-out_infinite]' : undefined}
      >
        <path d="M4 12V8a4 4 0 0 1 4-4h4" />
        <path d="M28 4h4a4 4 0 0 1 4 4v4" />
        <path d="M36 28v4a4 4 0 0 1-4 4h-4" />
        <path d="M12 36H8a4 4 0 0 1-4-4v-4" />
      </g>
      <path d="M22.2 9 13.5 21.4h6.2L17.8 31l8.7-12.4h-6.2L22.2 9Z" fill="url(#bm-g)" />
      <style>{`@keyframes bm-frame{0%,100%{transform:scale(1)}50%{transform:scale(0.86)}}`}</style>
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BlitzMark className="h-9 w-9 sm:h-10 sm:w-10" />
      <span className="text-[1.125rem] font-bold tracking-[-0.035em] text-ink sm:text-[1.25rem]">
        BOT <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">Blitz</span>
      </span>
    </span>
  )
}
