// Build-time guard: the chain config comes from env (values taken from the official BOT Chain docs,
// https://dev-docs.bohr.life/docs/Developers/quick-guide/). Before every build we ask the RPC itself
// which chain it serves and whether the game contract has code there, so a stale or mistyped config
// fails the build instead of shipping.
import { readFileSync, existsSync } from 'node:fs'

function loadEnv(file) {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv('.env.production.local')
loadEnv('.env.local')
loadEnv('.env')

const rpc = process.env.NEXT_PUBLIC_BOT_RPC_URL
const chainId = Number(process.env.NEXT_PUBLIC_BOT_CHAIN_ID)
const address = process.env.NEXT_PUBLIC_BLITZ_ADDRESS

if (!rpc || !chainId) {
  console.error('check-chain: set NEXT_PUBLIC_BOT_RPC_URL and NEXT_PUBLIC_BOT_CHAIN_ID (see .env.example)')
  process.exit(1)
}

async function call(method, params = []) {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.result
}

try {
  const remote = Number(await call('eth_chainId'))
  if (remote !== chainId) {
    console.error(`check-chain: RPC ${rpc} serves chain ${remote}, env says ${chainId}`)
    process.exit(1)
  }
  console.log(`check-chain: ${rpc} -> chain ${remote} ok`)
  if (address) {
    const code = await call('eth_getCode', [address, 'latest'])
    if (!code || code === '0x') {
      console.error(`check-chain: no contract code at ${address} on chain ${remote}`)
      process.exit(1)
    }
    console.log(`check-chain: BOTBlitz code found at ${address}`)
  } else {
    console.warn('check-chain: NEXT_PUBLIC_BLITZ_ADDRESS not set - the app will build but cannot play')
  }
} catch (err) {
  console.error(`check-chain: could not reach ${rpc}: ${err.message}`)
  process.exit(1)
}
