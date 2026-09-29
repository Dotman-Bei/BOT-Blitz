'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Wordmark } from './BlitzMark'
import { ConnectButton } from './ConnectButton'
import { IconClose, IconMenu } from './Icons'

const links = [
  { href: '/play/', label: 'Play' },
  { href: '/leaderboard/', label: 'Leaderboard' },
  { href: '/profile/', label: 'Profile' },
]

export function SiteHeader() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const active = (href: string) => path?.replace(/\/?$/, '/') === href

  return (
    <header className="glass-bar sticky top-0 z-40 border-b pt-safe">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-3 sm:px-6">
        <Link href="/" aria-label="BOT Blitz home" className="rounded-xl">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? 'page' : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active(l.href) ? 'bg-white/80 text-brand-600 shadow-ghost' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <span className="ml-2">
            <ConnectButton />
          </span>
        </nav>

        <div className="flex items-center gap-2 sm:hidden">
          <ConnectButton compact />
          <button
            type="button"
            className="chip !h-10 !w-10 !text-ink"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-menu" aria-label="Main" className="px-4 pb-4 sm:hidden">
          <div className="card-sm grid gap-1 p-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={active(l.href) ? 'page' : undefined}
                className={`rounded-xl px-4 py-3 text-[0.9375rem] font-semibold ${
                  active(l.href) ? 'bg-white text-brand-600 shadow-ghost' : 'text-ink'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  )
}
