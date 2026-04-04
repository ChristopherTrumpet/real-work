'use client'

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'

import { FlickeringGrid } from '@/components/ui/flickering-grid'

/** Rotating hero lines — type → pause → delete → next */
export const HERO_HEADLINES = [
  'Practice like it ships.',
  'Solve challenges inside real containers.',
  'Debug where the code actually runs.',
  'Learn from challenges the community ships.',
  'Real environments. Real feedback.',
] as const

type HeroSectionProps = {
  children: ReactNode
}

export function HeroSection({ children }: HeroSectionProps) {
  const [displayText, setDisplayText] = useState('')
  const [skipTyping, setSkipTyping] = useState(false)

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayText(HERO_HEADLINES[0])
      setSkipTyping(true)
    }
  }, [])

  useEffect(() => {
    if (skipTyping) return

    let cancelled = false
    let phraseI = 0
    let chars = 0
    let phase: 'typing' | 'pause' | 'deleting' = 'typing'
    let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined

    const phrase = () => HERO_HEADLINES[phraseI % HERO_HEADLINES.length]

    const step = () => {
      if (cancelled) return
      const p = phrase()

      if (phase === 'typing') {
        if (chars < p.length) {
          chars++
          setDisplayText(p.slice(0, chars))
          timeoutId = setTimeout(step, 44)
        } else {
          phase = 'pause'
          timeoutId = setTimeout(step, 2400)
        }
      } else if (phase === 'pause') {
        phase = 'deleting'
        step()
      } else if (phase === 'deleting') {
        if (chars > 0) {
          chars--
          setDisplayText(p.slice(0, chars))
          timeoutId = setTimeout(step, 26)
        } else {
          phraseI++
          timeoutId = setTimeout(() => {
            phase = 'typing'
            step()
          }, 380)
        }
      }
    }

    step()
    return () => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [skipTyping])

  const ariaLabel = HERO_HEADLINES.join(' ')

  return (
    <section className="relative border-b border-border">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden bg-background"
        aria-hidden
      >
        <div className="absolute inset-0 text-primary">
          <FlickeringGrid
            className="absolute inset-0 opacity-80"
            squareSize={4}
            gridGap={6}
            flickerChance={0.35}
            color="currentColor"
            maxOpacity={0.35}
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-35%,color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent_58%)]" />
        {/* Readability: veil over the grid so type does not compete with motion */}
        <div
          className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_115%_75%_at_50%_38%,color-mix(in_oklab,var(--background)_88%,transparent)_0%,color-mix(in_oklab,var(--background)_45%,transparent)_52%,transparent_78%)]"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 md:pb-24 md:pt-20">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary drop-shadow-[0_1px_2px_color-mix(in_oklab,var(--background)_85%,transparent)] sm:text-left">
          Live environments · Real debugging
        </p>
        <h1
          className="mx-auto min-h-[5rem] max-w-3xl text-center text-3xl font-semibold tracking-tight text-foreground [text-shadow:0_1px_0_color-mix(in_oklab,var(--background)_72%,transparent),0_0_2.5rem_color-mix(in_oklab,var(--background)_55%,transparent)] sm:mx-0 sm:min-h-[6rem] sm:text-left sm:text-4xl md:min-h-[7rem] md:text-5xl md:leading-[1.15]"
          aria-label={ariaLabel}
        >
          <span className="text-foreground">{displayText}</span>
          {!skipTyping && (
            <span
              className="ml-0.5 inline-block h-[0.85em] w-[3px] translate-y-0.5 animate-pulse bg-primary align-baseline drop-shadow-[0_0_6px_color-mix(in_oklab,var(--background)_80%,transparent)] md:h-[0.9em]"
              aria-hidden
            />
          )}
        </h1>
        <div className="relative [&_p]:[text-shadow:0_0_1.75rem_color-mix(in_oklab,var(--background)_65%,transparent)]">
          {children}
        </div>
      </div>
    </section>
  )
}
