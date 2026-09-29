import { createPublicClient, defineChain, http, type Address } from 'viem'

// All network values come from env, sourced from the official BOT Chain docs and checked against
// the live RPC by scripts/check-chain.mjs before every build. Nothing here is typed in from memory.
// NEXT_PUBLIC_* must be referenced literally so Next can inline them.
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_BOT_CHAIN_ID ?? 0)
const RPC_URL = process.env.NEXT_PUBLIC_BOT_RPC_URL ?? ''
const EXPLORER_URL = (process.env.NEXT_PUBLIC_BOT_EXPLORER_URL ?? '').replace(/\/$/, '')
const SYMBOL = process.env.NEXT_PUBLIC_BOT_CURRENCY_SYMBOL || 'BOT'
const NAME = process.env.NEXT_PUBLIC_BOT_CHAIN_NAME || 'BOT Chain'

export const FAUCET_URL = process.env.NEXT_PUBLIC_BOT_FAUCET_URL || ''
export const BLITZ_ADDRESS = (process.env.NEXT_PUBLIC_BLITZ_ADDRESS || undefined) as Address | undefined
export const IS_CONFIGURED = Boolean(CHAIN_ID && RPC_URL && BLITZ_ADDRESS)

export const botChain = defineChain({
  id: CHAIN_ID,
  name: NAME,
  nativeCurrency: { name: SYMBOL, symbol: SYMBOL, decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: EXPLORER_URL ? { default: { name: 'BOTScan', url: EXPLORER_URL } } : undefined,
})

// Short polling: blocks land well under a second, so a 1s default would hide the chain's speed.
export const publicClient = createPublicClient({
  chain: botChain,
  transport: http(RPC_URL, { batch: true, retryCount: 2 }),
  pollingInterval: 200,
})

export const explorerTx = (hash: string) => (EXPLORER_URL ? `${EXPLORER_URL}/tx/${hash}` : undefined)
export const explorerAddress = (a: string) => (EXPLORER_URL ? `${EXPLORER_URL}/address/${a}` : undefined)
export const SYMBOL_NAME = SYMBOL
export const CHAIN_LABEL = NAME
