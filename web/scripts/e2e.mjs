// End-to-end smoke test of the on-chain game loop, using the same transaction path as the app:
// startRound with a session key + gas float, taps signed by the session key and sent raw,
// receipts parsed for ActionSubmitted, expiry enforced by the chain, finalize, float returned.
//
//   PLAYER_PRIVATE_KEY=0x... RPC_URL=... BLITZ_ADDRESS=0x... node scripts/e2e.mjs [taps]
//
// Prints every tx hash and the measured tap->receipt latency, which is the evidence the PRD asks for.
import {
  createPublicClient, createWalletClient, defineChain, encodeFunctionData, formatEther, http, parseEventLogs,
} from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/lib/abi.ts', import.meta.url), 'utf8')
const abi = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1))

const RPC = process.env.RPC_URL
const ADDRESS = process.env.BLITZ_ADDRESS
const EXPLORER = (process.env.EXPLORER_URL || '').replace(/\/$/, '')
const TAPS = Number(process.argv[2] || 8)
if (!RPC || !ADDRESS || !process.env.PLAYER_PRIVATE_KEY) {
  console.error('Set RPC_URL, BLITZ_ADDRESS and PLAYER_PRIVATE_KEY')
  process.exit(1)
}

const pc0 = createPublicClient({ transport: http(RPC) })
const chain = defineChain({
  id: await pc0.getChainId(),
  name: 'target',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
})
const pc = createPublicClient({ chain, transport: http(RPC), pollingInterval: 150 })
const player = privateKeyToAccount(process.env.PLAYER_PRIVATE_KEY)
const wallet = createWalletClient({ account: player, chain, transport: http(RPC) })
const session = privateKeyToAccount(generatePrivateKey())
const link = (h) => (EXPLORER ? `${EXPLORER}/tx/${h}` : h)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const read = (functionName, args = []) => pc.readContract({ address: ADDRESS, abi, functionName, args })

console.log(`chain ${chain.id} · contract ${ADDRESS} · player ${player.address}`)
console.log(`session key ${session.address}`)

// Settle anything left open from an earlier run.
const before = await read('getPlayer', [player.address])
if (before.activeRoundId !== 0n) {
  const r = await read('getRound', [before.activeRoundId])
  const wait = Number(r.endTime) * 1000 - Date.now() + 2000
  if (wait > 0) { console.log(`waiting ${Math.ceil(wait / 1000)}s for open round #${before.activeRoundId}`); await sleep(wait) }
}

const gasPrice = await pc.getGasPrice()
const float = gasPrice * (50_000n * BigInt(TAPS + 5) + 400_000n + 21_000n)

let t0 = performance.now()
const startHash = await wallet.writeContract({ address: ADDRESS, abi, functionName: 'startRound', args: [session.address], value: float })
const startRcpt = await pc.waitForTransactionReceipt({ hash: startHash })
const [started] = parseEventLogs({ abi, logs: startRcpt.logs, eventName: 'RoundStarted' })
const roundId = started.args.roundId
console.log(`startRound  ${startRcpt.status}  ${(performance.now() - t0).toFixed(0)}ms  round #${roundId}  float ${formatEther(float)}  ${link(startHash)}`)

let nonce = await pc.getTransactionCount({ address: session.address, blockTag: 'pending' })
const send = async (data, gas, to = ADDRESS, value = 0n) => {
  const tx = await session.signTransaction({ to, data, gas, value, gasPrice, nonce, chainId: chain.id, type: 'legacy' })
  const hash = await pc.sendRawTransaction({ serializedTransaction: tx })
  nonce++
  return hash
}

let r = await read('getRound', [roundId])
let target = r.currentTarget
let step = r.step
const latencies = []
for (let i = 0; i < TAPS; i++) {
  // Every 4th tap is deliberately wrong to prove misses don't score.
  const wrong = i % 4 === 3
  const choice = wrong ? (target + 1) % 9 : target
  t0 = performance.now()
  const hash = await send(encodeFunctionData({ abi, functionName: 'submitAction', args: [roundId, step, choice] }), 90_000n)
  const rc = await pc.waitForTransactionReceipt({ hash })
  const ms = performance.now() - t0
  latencies.push(ms)
  const [ev] = parseEventLogs({ abi, logs: rc.logs, eventName: 'ActionSubmitted' })
  console.log(`tap ${String(i + 1).padStart(2)}  cell ${choice + 1}  ${ev.args.correct ? 'HIT ' : 'miss'}  score ${ev.args.score}  ${ms.toFixed(0)}ms  gas ${rc.gasUsed}  ${link(hash)}`)
  if (ev.args.correct === wrong) throw new Error('unexpected correctness')
  target = ev.args.nextTarget
  step = ev.args.correct ? step + 1 : step
}

// Replay protection: an old step must revert.
try {
  await pc.simulateContract({ address: ADDRESS, abi, functionName: 'submitAction', args: [roundId, 0, 0], account: session.address })
  throw new Error('stale step was accepted')
} catch (e) {
  if (!/StaleStep|OneActionPerBlock/.test(String(e.message))) throw e
  console.log('replay of step 0 rejected by contract ✓')
}

const end = Number((await read('getRound', [roundId])).endTime)
const waitMs = end * 1000 - Date.now()
console.log(`waiting ${Math.max(0, Math.ceil(waitMs / 1000))}s for the 60s window to close on-chain…`)
for (;;) {
  try {
    await pc.simulateContract({ address: ADDRESS, abi, functionName: 'finalizeRound', args: [roundId], account: session.address })
    break
  } catch (e) {
    if (!/RoundNotExpired/.test(String(e.message))) throw e
    await sleep(Math.max(500, Math.min(5000, end * 1000 - Date.now())))
  }
}

try {
  await pc.simulateContract({ address: ADDRESS, abi, functionName: 'submitAction', args: [roundId, step, target], account: session.address })
  throw new Error('tap after expiry was accepted')
} catch (e) {
  if (!/RoundExpired/.test(String(e.message))) throw e
  console.log('tap after expiry rejected by contract ✓')
}

t0 = performance.now()
const finHash = await send(encodeFunctionData({ abi, functionName: 'finalizeRound', args: [roundId] }), 400_000n)
const finRc = await pc.waitForTransactionReceipt({ hash: finHash })
console.log(`finalize    ${finRc.status}  ${(performance.now() - t0).toFixed(0)}ms  gas ${finRc.gasUsed}  ${link(finHash)}`)

const bal = await pc.getBalance({ address: session.address })
const fee = 21_000n * gasPrice
if (bal > fee * 2n) {
  const sweepHash = await send('0x', 21_000n, player.address, bal - fee)
  await pc.waitForTransactionReceipt({ hash: sweepHash })
  console.log(`float returned ${formatEther(bal - fee)}  ${link(sweepHash)}`)
}

const final = await read('getRound', [roundId])
const stats = await read('getPlayer', [player.address])
const [boardPlayers, boardScores] = await read('getLeaderboard')
const rank = boardPlayers.findIndex((a) => a.toLowerCase() === player.address.toLowerCase())
latencies.sort((a, b) => a - b)
console.log('\n--- result (read from contract) ---')
console.log(`round #${roundId}: score ${final.score}, misses ${final.misses}, finalized ${final.finalized}`)
console.log(`player: best ${stats.bestScore} (round #${stats.bestRoundId}), rounds ${stats.totalRounds}, valid actions ${stats.totalValidActions}`)
console.log(`leaderboard rank: ${rank >= 0 ? `#${rank + 1} with ${boardScores[rank]}` : 'not on board'}`)
console.log(`tap->receipt latency: median ${latencies[latencies.length >> 1].toFixed(0)}ms, min ${latencies[0].toFixed(0)}ms, max ${latencies.at(-1).toFixed(0)}ms`)
console.log(`gas price ${formatEther(gasPrice * 1_000_000_000n)} gwei`)
