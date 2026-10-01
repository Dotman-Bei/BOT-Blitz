import { encodeFunctionData, type Address, type Hex } from 'viem'
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { blitzAbi } from './abi'
import { BLITZ_ADDRESS, botChain, publicClient } from './chain'

/*
 * A session key is a throwaway browser key the player authorises for one round in `startRound`.
 * It lets every tap become a transaction without a wallet popup, which is the only way a
 * 60-second, tap-per-transaction game is playable. It can only submit actions for the round it
 * was named in (the contract checks), it holds only a small gas float, and the float is sent back
 * to the player's wallet when the round settles.
 */

// Gas *limits* - the most a tx may use, sized from measurements with headroom. They don't change
// what a tx costs (you pay for gas used), only how much the key must hold for each tx.
// Measured: submitAction 38.6k (miss) / 42.4k (hit) live, 59.4k worst case in tests;
// finalizeRound 173.5k live, 252.3k worst case (full top-20 board).
export const ACTION_GAS = 70_000n
export const FINALIZE_GAS = 300_000n
const TRANSFER_GAS = 21_000n
// The float covers the fastest possible round at the measured cost: each tap waits for its receipt
// (median 0.84s on BOT Chain), so ~75 taps fit in 60s. Plus one settle and the sweep back.
// At the 20 gwei network floor that is ~0.071 BOT, and whatever isn't spent is returned.
const EXPECTED_ACTION_GAS = 43_000n
const MAX_ACTIONS = 75n

const storageKey = (player: Address) => `botblitz:session:${player.toLowerCase()}`

function read(player: Address): Hex | null {
  try {
    return (localStorage.getItem(storageKey(player)) as Hex | null) ?? null
  } catch {
    return null
  }
}

export function loadSessionAccount(player: Address): PrivateKeyAccount | null {
  const pk = read(player)
  try {
    return pk ? privateKeyToAccount(pk) : null
  } catch {
    return null
  }
}

export function getOrCreateSessionAccount(player: Address): PrivateKeyAccount | null {
  const existing = loadSessionAccount(player)
  if (existing) return existing
  const pk = generatePrivateKey()
  try {
    localStorage.setItem(storageKey(player), pk)
  } catch {
    return null // no storage: caller falls back to signing every tap in the wallet
  }
  return privateKeyToAccount(pk)
}

export function floatBudget(gasPrice: bigint) {
  return gasPrice * (EXPECTED_ACTION_GAS * MAX_ACTIONS + FINALIZE_GAS + TRANSFER_GAS)
}

/** Sequential sender with a locally tracked nonce, so a tap costs one RPC write and receipt polling. */
export class SessionSender {
  private nonce: number | null = null
  constructor(
    readonly account: PrivateKeyAccount,
    private gasPrice: bigint,
  ) {}

  async sync() {
    this.nonce = await publicClient.getTransactionCount({ address: this.account.address, blockTag: 'pending' })
  }

  async send(to: Address, data: Hex, gas: bigint, value = 0n): Promise<Hex> {
    if (this.nonce === null) await this.sync()
    const serializedTransaction = await this.account.signTransaction({
      to,
      data,
      gas,
      value,
      gasPrice: this.gasPrice,
      nonce: this.nonce!,
      chainId: botChain.id,
      type: 'legacy',
    })
    try {
      const hash = await publicClient.sendRawTransaction({ serializedTransaction })
      this.nonce! += 1
      return hash
    } catch (err) {
      this.nonce = null // resync on the next send
      throw err
    }
  }

  submitAction(roundId: bigint, step: number, choice: number) {
    const data = encodeFunctionData({ abi: blitzAbi, functionName: 'submitAction', args: [roundId, step, choice] })
    return this.send(BLITZ_ADDRESS!, data, ACTION_GAS)
  }

  finalize(roundId: bigint) {
    const data = encodeFunctionData({ abi: blitzAbi, functionName: 'finalizeRound', args: [roundId] })
    return this.send(BLITZ_ADDRESS!, data, FINALIZE_GAS)
  }

  /** Returns what's left of the float to the player. Resolves to null when there's nothing worth sending. */
  async sweepTo(player: Address): Promise<{ hash: Hex; value: bigint } | null> {
    const balance = await publicClient.getBalance({ address: this.account.address })
    const fee = TRANSFER_GAS * this.gasPrice
    if (balance <= fee * 2n) return null
    const value = balance - fee
    const hash = await this.send(player, '0x', TRANSFER_GAS, value)
    return { hash, value }
  }
}
