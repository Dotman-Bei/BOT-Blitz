import { formatEther } from 'viem'

export const shortAddress = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')

export const formatBot = (wei: bigint, digits = 4) => {
  const n = Number(formatEther(wei))
  return n.toLocaleString('en-US', { maximumFractionDigits: digits })
}

export const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`

export const formatCount = (n: bigint | number | undefined) =>
  n === undefined ? '-' : Number(n).toLocaleString('en-US')

/** Turns wallet/viem/contract errors into one plain sentence. Never claims success. */
export function explainError(err: unknown): string {
  const e = err as { name?: string; shortMessage?: string; message?: string; cause?: unknown }
  const text = `${e?.name ?? ''} ${e?.shortMessage ?? ''} ${e?.message ?? ''}`
  if (/UserRejected|User rejected|denied|4001/i.test(text)) return 'You declined in your wallet. Nothing was sent.'
  if (/RoundStillActive/.test(text)) return 'You already have a live round. Finish it first.'
  if (/RoundExpired/.test(text)) return 'The 60 seconds are up on-chain. That tap did not count.'
  if (/StaleStep/.test(text)) return 'That target was already answered. Synced with the chain.'
  if (/OneActionPerBlock/.test(text)) return 'One tap per block. That one landed in the same block and did not count.'
  if (/NotRoundOwner/.test(text)) return 'This wallet does not own that round.'
  if (/RoundNotExpired/.test(text)) return 'The round is still open on-chain.'
  if (/RoundAlreadyFinalized/.test(text)) return 'The round is already settled.'
  if (/insufficient funds/i.test(text)) return 'Not enough BOT for gas. Top up and try again.'
  if (/fetch|network|timeout|HTTP request failed/i.test(text)) return 'Could not reach the BOT Chain RPC. Check your connection and retry.'
  return e?.shortMessage || 'The transaction did not go through.'
}
