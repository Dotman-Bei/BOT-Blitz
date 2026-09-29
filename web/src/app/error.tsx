'use client'

import Link from 'next/link'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8 text-center" role="alert">
        <p className="eyebrow">Something broke</p>
        <h1 className="mt-4 text-[1.5rem]">This page hit an error.</h1>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">Your rounds and scores are safe - they live on-chain, not here.</p>
        <div className="mt-7 grid gap-2.5">
          <button type="button" onClick={reset} className="btn-primary w-full">Try again</button>
          <Link href="/" className="btn-ghost w-full">Back home</Link>
        </div>
        {error.digest ? <p className="mt-5 font-mono text-[0.6875rem] text-ink-soft">{error.digest}</p> : null}
      </div>
    </div>
  )
}
