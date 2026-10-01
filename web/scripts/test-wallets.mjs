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
// A direct (no session key) tap writes the round's second storage slot for the first time
// (zero -> non-zero, 20k gas), so it costs ~59.4k, not the 42.4k of a session-key tap.
// eth_estimateGas on mainnet: 60,176. A 50k limit ran out of gas - see README.
const TAP_GAS = 61_000n
const FINALIZE_GAS = 72_000n // measured 70,553 to settle a 0-score round
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
const NEED = 130_500n * GAS_PRICE + TAP_GAS * GAS_PRICE

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
  // A wallet left with an expired open round (e.g. its tap failed) gets that round settled instead:
  // one cheap finalizeRound rather than a whole new round.
  if (stats.activeRoundId !== 0n) {
    const open = await pc.readContract({ address: ADDRESS, abi, functionName: 'getRound', args: [stats.activeRoundId] })
    const now = (await pc.getBlock()).timestamp
    const canSettle = now >= open.endTime && balance >= FINALIZE_GAS * GAS_PRICE
    const state = canSettle ? 'settle' : now < open.endTime ? 'still live, wait' : `NEEDS ${formatEther(FINALIZE_GAS * GAS_PRICE)} BOT to settle`
    console.log(`${w.label} ${account.address}  balance ${formatEther(balance)} BOT  open round #${stats.activeRoundId} -> ${state}`)
    if (!SEND || !canSettle) continue
    const nonce = await pc.getTransactionCount({ address: account.address, blockTag: 'pending' })
    const fin = await send(account, nonce, encodeFunctionData({ abi, functionName: 'finalizeRound', args: [stats.activeRoundId] }), FINALIZE_GAS)
    console.log(`  settled round #${stats.activeRoundId}  gas ${fin.receipt.gasUsed}  ${EXPLORER}/tx/${fin.hash}`)
    results.push({ label: w.label, address: account.address, roundId: stats.activeRoundId.toString(), finalizeTx: fin.hash, gasUsed: [fin.receipt.gasUsed.toString()] })
    continue
  }
  const ready = balance >= NEED
  console.log(`${w.label} ${account.address}  balance ${formatEther(balance)} BOT  ${ready ? 'ready' : `NEEDS ${formatEther(NEED)} BOT`}`)
  if (!SEND || !ready) continue

  let nonce = await pc.getTransactionCount({ address: account.address, blockTag: 'pending' })
  const start = await send(account, nonce++, encodeFunctionData({ abi, functionName: 'startRound', args: [zeroAddress] }), START_GAS)
  const [ev] = parseEventLogs({ abi, logs: start.receipt.logs, eventName: 'RoundStarted' })
  const roundId = ev.args.roundId

  // One action per block per round: wait for the next block, then tap the lit cell.
  const startBlock = start.receipt.blockNumber
  while ((await pc.getBlockNumber()) <= startBlock) await sleep(200)
  const round = await pc.readContract({ address: ADDRESS, abi, functionName: 'getRound', args: [roundId] })
  // Never send a tap that would run out of gas: check this exact call against the limit first.
  const tapEstimate = await pc.estimateContractGas({
    address: ADDRESS, abi, functionName: 'submitAction', args: [roundId, round.step, round.currentTarget], account: account.address,
  })
  if (tapEstimate > TAP_GAS) throw new Error(`tap needs ${tapEstimate} gas > limit ${TAP_GAS}; not sending`)
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
  const sent = results.reduce((n, r) => n + (r.finalizeTx ? 1 : 2), 0)
  console.log(`\n${sent} transactions sent; evidence saved to ops/test-wallet-interactions.json`)
} else if (!SEND) {
  console.log(`\nDry run. Each wallet needs ${formatEther(NEED)} BOT. Re-run with --send.`)
}
