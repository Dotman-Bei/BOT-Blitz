'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { botChain } from '@/lib/chain'
import { shortAddress } from '@/lib/format'
import { IconWallet } from './Icons'

export function useMounted() {
  const [m, setM] = useState(false)
  useEffect(() => setM(true), [])
  return m
}

export function useConnectWallet() {
  const { connectors, connect, isPending, error } = useConnect()
  const hasWallet = typeof window !== 'undefined' && Boolean((window as { ethereum?: unknown }).ethereum)
  const connectNow = () => {
    const c = connectors[0]
    if (c) connect({ connector: c, chainId: botChain.id })
  }
  return { connectNow, isPending, error, hasWallet }
}

export function ConnectButton({ compact = false }: { compact?: boolean }) {
  const mounted = useMounted()
  const { address, isConnected, chainId } = useAccount()
  const { disconnect } = useDisconnect()
  const { connectNow, isPending } = useConnectWallet()

  if (!mounted) return <span className="inline-block h-10 w-32" aria-hidden="true" />

  if (!isConnected || !address) {
    return (
      <button
        type="button"
        onClick={connectNow}
        disabled={isPending}
        aria-label={isPending ? 'Check your wallet' : 'Connect wallet'}
        className={`btn-ghost whitespace-nowrap ${compact ? '!px-3 !py-2 text-sm xs:!px-4' : '!py-2.5 text-sm'}`}
      >
        <IconWallet />
        {/* Icon-only below 400px so the wordmark keeps its width on the smallest phones. */}
        <span className={compact ? 'hidden xs:inline' : undefined}>{isPending ? 'Check wallet…' : 'Connect'}</span>
      </button>
    )
  }

  const right = chainId === botChain.id
  return (
    <button
      type="button"
      onClick={() => disconnect()}
      title={`${address} - tap to disconnect`}
      aria-label={`Connected as ${address}. Disconnect`}
      className={`btn-ghost whitespace-nowrap text-sm ${compact ? '!px-3 !py-2 xs:!px-4' : '!px-4 !py-2.5'}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${right ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
      <span className="font-mono text-[0.8125rem]">{shortAddress(address)}</span>
    </button>
  )
}
