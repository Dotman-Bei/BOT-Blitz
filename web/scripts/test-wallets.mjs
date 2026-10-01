// Team test wallets: each starts one round and makes one scoring tap on BOT Chain mainnet.
// Two transactions per wallet, signed directly (no session key, no float), at the 20 gwei floor.
// These are TEAM wallets for proof that the product works across wallets, not user traction.
//
//   node scripts/test-wallets.mjs            # dry run: balances and plan only
//   node scripts/test-wallets.mjs --send     # send the transactions
//
// Keys come from ../ops/test-wallets.local.json (gitignored). Public results go to
// ../ops/test-wallet-interactions.json.
import {
  createPublicClient, defineChain, encodeFunctionData, formatEther, http, parseEventLogs, zeroAddress,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { readFileSync, writeFileSync } from 'node:fs'

const RPC = 'https://rpc.botchain.ai'
const EXPLORER = 'https://scan.botchain.ai'
const ADDRESS = '0x3d6F702BbF55dA10EAe0eC24ef4Cc262F3a71f3C'
const GAS_PRICE = 20_000_000_000n // network floor on mainnet
const START_GAS = 140_000n // measured 131,481 for a first-time player
const TAP_GAS = 50_000n // measured 42,383 for a hit
const SEND = process.argv.includes('--send')

const src = readFileSync(new URL('../src/lib/abi.ts', import.meta.url), 'utf8')
const abi = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1))
const wallets = JSON.parse(readFileSync(new URL('../../ops/test-wallets.local.json', import.meta.url), 'utf8'))

const chain = defineChain({
  id: 677,
  name: 'BOT Chain',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
})
const pc = createPublicClient({ chain, transport: http(RPC), pollingInterval: 150 })
if ((await pc.getChainId()) !== 677) throw new Error('not BOT Chain mainnet')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// The balance a wallet needs: spend on the start, plus the tap's full gas limit on hand.
const NEED = 131_500n * GAS_PRICE + TAP_GAS * GAS_PRICE

async function send(account, nonce, data, gas) {
  const tx = await account.signTransaction({ to: ADDRESS, data, gas, gasPrice: GAS_PRICE, nonce, chainId: 677, type: 'legacy' })
  const hash = await pc.sendRawTransaction({ serializedTransaction: tx })
  const receipt = await pc.waitForTransactionReceipt({ hash, timeout: 60_000 })
  if (receipt.status !== 'success') throw new Error(`reverted: ${hash}`)
  return { hash, receipt }
}

const results = []
for (const w of wallets) {
  const account = privateKeyToAccount(w.private_key)
  const balance = await pc.getBalance({ address: account.address })
  const stats = await pc.readContract({ address: ADDRESS, abi, functionName: 'getPlayer', args: [account.address] })
  const ready = balance >= NEED && stats.activeRoundId === 0n
  console.log(`${w.label} ${account.address}  balance ${formatEther(balance)} BOT  ${ready ? 'ready' : balance < NEED ? `NEEDS ${formatEther(NEED)} BOT` : `has open round #${stats.activeRoundId}`}`)
  if (!SEND || !ready) continue

  let nonce = await pc.getTransactionCount({ address: account.address, blockTag: 'pending' })
  const start = await send(account, nonce++, encodeFunctionData({ abi, functionName: 'startRound', args: [zeroAddress] }), START_GAS)
  const [ev] = parseEventLogs({ abi, logs: start.receipt.logs, eventName: 'RoundStarted' })
  const roundId = ev.args.roundId

  // One action per block per round: wait for the next block, then tap the lit cell.
  const startBlock = start.receipt.blockNumber
  while ((await pc.getBlockNumber()) <= startBlock) await sleep(200)
  const round = await pc.readContract({ address: ADDRESS, abi, functionName: 'getRound', args: [roundId] })
  const tap = await send(
    account, nonce++,
    encodeFunctionData({ abi, functionName: 'submitAction', args: [roundId, round.step, round.currentTarget] }),
    TAP_GAS,
  )
  const [act] = parseEventLogs({ abi, logs: tap.receipt.logs, eventName: 'ActionSubmitted' })

  const spent = start.receipt.gasUsed * GAS_PRICE + tap.receipt.gasUsed * GAS_PRICE
  console.log(`  round #${roundId}  start ${EXPLORER}/tx/${start.hash}`)
  console.log(`  tap cell ${round.currentTarget + 1} -> ${act.args.correct ? 'HIT' : 'miss'}, score ${act.args.score}  ${EXPLORER}/tx/${tap.hash}`)
  console.log(`  gas ${start.receipt.gasUsed} + ${tap.receipt.gasUsed}, spent ${formatEther(spent)} BOT`)
  results.push({
    label: w.label,
    address: account.address,
    roundId: roundId.toString(),
    startTx: start.hash,
    tapTx: tap.hash,
    score: act.args.score,
    gasUsed: [start.receipt.gasUsed.toString(), tap.receipt.gasUsed.toString()],
  })
}

if (SEND && results.length) {
  const file = new URL('../../ops/test-wallet-interactions.json', import.meta.url)
  let prior = []
  try { prior = JSON.parse(readFileSync(file, 'utf8')) } catch { /* first run */ }
  writeFileSync(file, JSON.stringify([...prior, ...results], null, 2) + '\n')
  console.log(`\n${results.length * 2} transactions sent; evidence saved to ops/test-wallet-interactions.json`)
} else if (!SEND) {
  console.log(`\nDry run. Each wallet needs ${formatEther(NEED)} BOT. Re-run with --send.`)
}
