'use client'

import { useState } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { botChain, CHAIN_LABEL, IS_CONFIGURED } from '@/lib/chain'
import { explainError } from '@/lib/format'
import { Banner } from './Banner'
import { useConnectWallet, useMounted } from './ConnectButton'
import { IconSwap, IconWallet } from './Icons'

export type GateState = 'loading' | 'unconfigured' | 'no-wallet' | 'disconnected' | 'wrong-network' | 'ready'

export function useGate() {
  const mounted = useMounted()
  const { address, isConnected, chainId, status } = useAccount()
  const { hasWallet } = useConnectWallet()
  let state: GateState = 'ready'
  if (!mounted || status === 'reconnecting' || status === 'connecting') state = 'loading'
  else if (!IS_CONFIGURED) state = 'unconfigured'
  else if (!isConnected) state = hasWallet ? 'disconnected' : 'no-wallet'
  else if (chainId !== botChain.id) state = 'wrong-network'
  return { state, address: isConnected ? address : undefined }
}

export function useSwitchToBot() {
  const { switchChainAsync, isPending } = useSwitchChain()
  const [error, setError] = useState<string | null>(null)
  const switchNow = async () => {
    setError(null)
    try {
      await switchChainAsync({ chainId: botChain.id })
    } catch (err) {
      setError(explainError(err))
    }
  }
  return { switchNow, isPending, error }
}

/** Explains whatever stands between the user and the chain, with the one action that fixes it. */
export function GateBanner({ state }: { state: GateState }) {
  const { connectNow, isPending, error: connectError } = useConnectWallet()
  const { switchNow, isPending: switching, error: switchError } = useSwitchToBot()
  const rpc = botChain.rpcUrls.default.http[0]

  if (state === 'unconfigured')
    return (
      <Banner tone="notice" lead="Not deployed yet.">
        This build has no BOTBlitz contract address. Set NEXT_PUBLIC_BLITZ_ADDRESS and rebuild.
      </Banner>
    )
  if (state === 'no-wallet')
    return (
      <Banner tone="notice" lead="No wallet found." icon={<IconWallet />}>
        Install an EVM wallet such as MetaMask or BO Wallet, then reload. Your wallet address is your player identity.
      </Banner>
    )
  if (state === 'disconnected')
    return (
      <Banner
        lead="Connect a wallet to play."
        icon={<IconWallet />}
        action={
          <button type="button" className="btn-primary !px-5 !py-2.5 text-sm" onClick={connectNow} disabled={isPending}>
            {isPending ? 'Check your wallet…' : 'Connect wallet'}
          </button>
        }
      >
        No account, no password - your address is your player.
        {connectError ? <span className="mt-1 block text-rose-700">{explainError(connectError)}</span> : null}
      </Banner>
    )
  if (state === 'wrong-network')
    return (
      <Banner
        tone="notice"
        lead={`Switch to ${CHAIN_LABEL}.`}
        icon={<IconSwap />}
        action={
          <button type="button" className="btn-primary !px-5 !py-2.5 text-sm" onClick={switchNow} disabled={switching}>
            {switching ? 'Check your wallet…' : `Switch to ${CHAIN_LABEL}`}
          </button>
        }
      >
        Your wallet is on another network. Nothing can be read or sent until it is on chain {botChain.id}.
        {switchError ? (
          <span className="mt-1 block text-rose-700">
            {switchError} Add it manually: chain ID {botChain.id}, RPC <span className="font-mono">{rpc}</span>.
          </span>
        ) : null}
      </Banner>
    )
  return null
}
