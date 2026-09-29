'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { PlayView } from '@/components/PlayView'
import { useGate } from '@/components/WalletGate'
import { usePlayerStats } from '@/lib/reads'
import { useBlitzGame } from '@/lib/useBlitzGame'

export default function PlayPage() {
  const gate = useGate()
  const game = useBlitzGame(gate.address, gate.state === 'ready')
  const stats = usePlayerStats(gate.address)
  const qc = useQueryClient()

  // Once a round settles, every chain-backed view should re-read.
  useEffect(() => {
    if (game.phase === 'done') void qc.invalidateQueries()
  }, [game.phase, qc])

  return <PlayView gate={gate.state} game={game} best={stats.data ? Number(stats.data.bestScore) : undefined} />
}
