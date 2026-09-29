'use client'

import { useEffect, useState } from 'react'
import { BlitzMark } from './BlitzMark'

type Stage = 'lit' | 'tap' | 'pending' | 'confirmed'

const PATH = [4, 0, 7, 2, 5, 8, 1, 6, 3]
// One orchestrated loop: light a cell, tap it, wait for the block, score it, light the next.
const TIMELINE: [Stage, number][] = [
  ['lit', 650],
  ['tap', 150],
  ['pending', 650],
  ['confirmed', 450],
]

// The frozen frame for reduced motion still reads as the whole story: a confirmed tap,
// a score, the next cell already lit.
const FROZEN = { idx: 3, stage: 'confirmed' as Stage, score: 13, secs: 41, block: 24_781_203 }

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

export function HeroDemo() {
  const reduced = useReducedMotion()
  const [s, setS] = useState({ idx: 0, stage: 'lit' as Stage, score: 9, secs: 45, block: 24_781_190 })

  useEffect(() => {
    if (reduced) return
    let stageIdx = 0
    let timer: ReturnType<typeof setTimeout>
    const step = () => {
      stageIdx = (stageIdx + 1) % TIMELINE.length
      const stage = TIMELINE[stageIdx][0]
      setS((prev) => {
        if (stage === 'confirmed') return { ...prev, stage, score: prev.score + 1, block: prev.block + 1 }
        if (stage === 'lit') {
          const idx = (prev.idx + 1) % PATH.length
          const secs = prev.secs <= 16 ? 45 : prev.secs - 2
          return { ...prev, stage, idx, secs, score: secs === 45 ? 9 : prev.score }
        }
        return { ...prev, stage }
      })
      timer = setTimeout(step, TIMELINE[stageIdx][1])
    }
    timer = setTimeout(step, TIMELINE[0][1])
    return () => clearTimeout(timer)
  }, [reduced])

  const view = reduced ? FROZEN : s
  // After confirmation the chain has already lit the next cell.
  const litCell = view.stage === 'confirmed' ? PATH[(view.idx + 1) % PATH.length] : PATH[view.idx]
  const tappedCell = PATH[view.idx]

  return (
    <div className="relative mx-auto w-full max-w-[20rem]" aria-hidden="true">
      {/* callout for depth */}
      <div className="card-sm absolute -left-10 bottom-24 z-10 hidden w-40 p-3 sm:block lg:-left-24">
        <p className="text-[0.5625rem] font-bold uppercase tracking-[0.2em] text-ink-soft">Score source</p>
        <p className="mt-1 text-[0.75rem] font-bold leading-snug text-ink">Read from the contract, not the app</p>
      </div>

      <div className="rounded-[2.75rem] border border-white bg-white/60 p-2.5 shadow-card backdrop-blur-xl">
        <div className="overflow-hidden rounded-[2.125rem] bg-gradient-to-b from-haze-50 to-haze-200 px-4 pb-5 pt-3">
          {/* status bar */}
          <div className="flex items-center justify-between px-1 text-[0.5625rem] font-semibold text-ink-muted">
            <span>9:41</span>
            <span className="h-4 w-16 rounded-full bg-ink/90" />
            <span>BOT</span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BlitzMark className="h-5 w-5" />
              <span className="text-[0.6875rem] font-bold text-ink">Blitz Round</span>
            </span>
            <span className="tabular rounded-full bg-white/85 px-2.5 py-1 text-[0.625rem] font-bold text-ink shadow-ghost">
              0:{String(view.secs).padStart(2, '0')}
            </span>
          </div>

          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[0.5625rem] font-bold uppercase tracking-[0.2em] text-ink-soft">Verified score</p>
              <p className="tabular text-[2.25rem] font-bold leading-none tracking-[-0.04em] text-ink">{view.score}</p>
            </div>
            <p className="text-right text-[0.5625rem] text-ink-soft">
              step {view.score + 1}
              <br />
              round #1284
            </p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }, (_, i) => {
              const lit = i === litCell
              const tapping = i === tappedCell && (view.stage === 'tap' || view.stage === 'pending')
              return (
                <div
                  key={i}
                  className={`relative aspect-square rounded-xl border transition-colors duration-200 ${
                    lit ? 'border-white/60 bg-brand-gradient shadow-brand' : 'border-white bg-white/65'
                  }`}
                >
                  {tapping && view.stage === 'tap' ? <span className="demo-tap absolute inset-3 rounded-full bg-white/70" /> : null}
                  {tapping && view.stage === 'pending' ? (
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="spin h-5 w-5 rounded-full border-2 border-white/40 border-t-white" />
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-2 shadow-ghost">
            <div className="min-w-0 flex-1">
              <p className="text-[0.625rem] font-bold text-ink">Tap cell {tappedCell + 1}</p>
              <p className="font-mono text-[0.5625rem] text-ink-soft">
                {view.stage === 'confirmed' ? `block ${view.block.toLocaleString('en-US')}` : 'submitAction(…)'}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[0.5625rem] font-bold ${
                view.stage === 'confirmed'
                  ? 'bg-emerald-50 text-emerald-800'
                  : view.stage === 'lit'
                    ? 'bg-haze-200 text-ink-soft'
                    : 'bg-brand-50 text-brand-600'
              }`}
            >
              {view.stage === 'confirmed' ? '+1 · Confirmed' : view.stage === 'lit' ? 'Ready' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
