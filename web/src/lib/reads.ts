'use client'

import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { blitzAbi } from './abi'
import { BLITZ_ADDRESS, publicClient } from './chain'

const enabled = Boolean(BLITZ_ADDRESS)

export function useGlobalStats() {
  return useQuery({
    queryKey: ['globalStats'],
    enabled,
    refetchInterval: 10_000,
    queryFn: async () => {
      const [roundsStarted, roundsCompleted, validActions, actions, players] = await publicClient.readContract({
        address: BLITZ_ADDRESS!,
        abi: blitzAbi,
        functionName: 'globalStats',
      })
      return { roundsStarted, roundsCompleted, validActions, actions, players }
    },
  })
}

/** Measured, not claimed: average block time over the last 100 blocks and the live gas price. */
export function useChainPulse() {
  return useQuery({
    queryKey: ['chainPulse'],
    refetchInterval: 15_000,
    queryFn: async () => {
      const latest = await publicClient.getBlock({ blockTag: 'latest' })
      const [earlier, gasPrice] = await Promise.all([
        publicClient.getBlock({ blockNumber: latest.number - 100n }),
        publicClient.getGasPrice(),
      ])
      const blockTimeMs = (Number(latest.timestamp - earlier.timestamp) * 1000) / 100
      return { blockTimeMs, gasPrice, blockNumber: latest.number }
    },
  })
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    enabled,
    refetchInterval: 10_000,
    queryFn: async () => {
      const [players, scores, roundIds] = await publicClient.readContract({
        address: BLITZ_ADDRESS!,
        abi: blitzAbi,
        functionName: 'getLeaderboard',
      })
      return players.map((player, i) => ({ rank: i + 1, player, score: scores[i], roundId: roundIds[i] }))
    },
  })
}

export function usePlayerStats(player?: Address) {
  return useQuery({
    queryKey: ['player', player],
    enabled: enabled && Boolean(player),
    refetchInterval: 10_000,
    queryFn: () =>
      publicClient.readContract({ address: BLITZ_ADDRESS!, abi: blitzAbi, functionName: 'getPlayer', args: [player!] }),
  })
}

export function usePlayerHistory(player?: Address, limit = 10) {
  return useQuery({
    queryKey: ['history', player, limit],
    enabled: enabled && Boolean(player),
    refetchInterval: 15_000,
    queryFn: async () => {
      const ids = await publicClient.readContract({
        address: BLITZ_ADDRESS!,
        abi: blitzAbi,
        functionName: 'getPlayerRounds',
        args: [player!, 0n, BigInt(limit)],
      })
      const rounds = await Promise.all(
        ids.map((id) =>
          publicClient.readContract({ address: BLITZ_ADDRESS!, abi: blitzAbi, functionName: 'getRound', args: [id] }),
        ),
      )
      return rounds.map((r, i) => ({ id: ids[i], ...r }))
    },
  })
}

export function useBalance(address?: Address) {
  return useQuery({
    queryKey: ['balance', address],
    enabled: Boolean(address),
    refetchInterval: 10_000,
    queryFn: () => publicClient.getBalance({ address: address! }),
  })
}
