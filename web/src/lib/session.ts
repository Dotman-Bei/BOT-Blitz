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

// Measured with `forge test --gas-report`: submitAction 24k-59k, finalizeRound up to ~252k.
export const ACTION_GAS = 90_000n
export const FINALIZE_GAS = 400_000n
const TRANSFER_GAS = 21_000n
// One action per block per round; ~90 blocks fit in 60s at the measured block time. We budget for
// that ceiling at the typical cost, plus a finalize and the sweep.
const EXPECTED_ACTION_GAS = 50_000n
const MAX_ACTIONS = 90n

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
