import { createConfig, http } from 'wagmi'
import { injected } from '@wagmi/core'
import { botChain } from './chain'

export const wagmiConfig = createConfig({
  chains: [botChain],
  connectors: [injected({ shimDisconnect: true })],
  transports: { [botChain.id]: http(botChain.rpcUrls.default.http[0]) },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
