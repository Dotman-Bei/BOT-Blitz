import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 text-[1.5rem]">No block at this address.</h1>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">This page doesn&apos;t exist. The game does.</p>
        <div className="mt-7 grid gap-2.5">
          <Link href="/play/" className="btn-primary w-full">Start a 60s round</Link>
          <Link href="/" className="btn-ghost w-full">Back home</Link>
        </div>
      </div>
    </div>
  )
}
