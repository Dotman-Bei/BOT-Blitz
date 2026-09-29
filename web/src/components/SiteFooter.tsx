import Link from 'next/link'
import { BLITZ_ADDRESS, CHAIN_LABEL, explorerAddress, FAUCET_URL, botChain } from '@/lib/chain'
import { shortAddress } from '@/lib/format'
import { Wordmark } from './BlitzMark'

const head = 'font-mono text-[0.625rem] uppercase tracking-[0.22em] text-brand-500'
const link = 'font-mono text-[0.78rem] text-ink-muted hover:text-ink'

export function SiteFooter() {
  const explorer = botChain.blockExplorers?.default.url
  const contract = BLITZ_ADDRESS ? explorerAddress(BLITZ_ADDRESS) : undefined
  return (
    <footer className="mx-auto mt-24 max-w-6xl px-6 pb-40 lg:pb-16">
      <div className="grid gap-10 border-t border-white/70 pt-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-[16rem] text-[0.8125rem] leading-relaxed text-ink-muted">
            A 60-second game where every tap is a {CHAIN_LABEL} transaction - and the contract keeps score.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className={head}>Game</h3>
          <ul className="space-y-2">
            <li><Link className={link} href="/play/">Play a round</Link></li>
            <li><Link className={link} href="/leaderboard/">Leaderboard</Link></li>
            <li><Link className={link} href="/profile/">Your profile</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className={head}>Chain</h3>
          <ul className="space-y-2">
            {explorer ? <li><a className={link} href={explorer} target="_blank" rel="noreferrer">BOTScan explorer</a></li> : null}
            {FAUCET_URL ? <li><a className={link} href={FAUCET_URL} target="_blank" rel="noreferrer">Testnet faucet</a></li> : null}
            <li><a className={link} href="https://dev-docs.bohr.life/docs/Developers/" target="_blank" rel="noreferrer">BOT Chain docs</a></li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className={head}>Contract</h3>
          <ul className="space-y-2">
            <li>
              {contract ? (
                <a className={link} href={contract} target="_blank" rel="noreferrer">
                  BOTBlitz {shortAddress(BLITZ_ADDRESS)}
                </a>
              ) : (
                <span className={link}>Not deployed yet</span>
              )}
            </li>
            <li><span className={link}>Chain ID {botChain.id}</span></li>
            <li><span className={link}>MIT licensed</span></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
