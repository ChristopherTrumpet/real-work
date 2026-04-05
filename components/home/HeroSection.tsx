'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { FlickeringGrid } from '@/components/ui/flickering-grid'
import { cn } from '@/lib/utils'

/** Hero cycles through these with a crossfade (no typing). */
export const HERO_HEADLINES = [
  'Ship real software in live environments.',
  'Solving problems where they actually occur.',
  'Master distributed systems by breaking them.',
  'Debug production-grade containers.',
  'Level up with community-rated engineering labs.',
] as const

function HeroHeadline({ className }: { className?: string }) {
  const [i, setI] = useState(0)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    if (reduced) return
    const t = window.setInterval(() => {
      setI((n) => (n + 1) % HERO_HEADLINES.length)
    }, 4500)
    return () => window.clearInterval(t)
  }, [reduced])

  const ariaLabel = HERO_HEADLINES.join(' ')

  if (reduced) {
    return (
      <h1
        className={cn(
          'mx-auto min-h-[12rem] max-w-4xl text-center font-mono text-[clamp(1.9rem,5.2vw,3.35rem)] font-bold leading-[1.2] tracking-tight text-foreground [text-shadow:0_1px_0_color-mix(in_oklab,var(--background)_88%,transparent),0_0_22px_color-mix(in_oklab,var(--background)_62%,transparent)] sm:min-h-[10.5rem] sm:text-left sm:leading-[1.18] md:min-h-[9.5rem] md:text-[clamp(2.1rem,4.2vw,3.65rem)] lg:min-h-[8.75rem]',
          className
        )}
        aria-label={ariaLabel}
      >
        <span className="text-pretty">{HERO_HEADLINES[0]}</span>
      </h1>
    )
  }

  return (
    <h1
      className={cn(
        'relative mx-auto min-h-[12rem] max-w-4xl text-center font-mono text-[clamp(1.9rem,5.2vw,3.35rem)] font-bold leading-[1.2] tracking-tight [text-shadow:0_1px_0_color-mix(in_oklab,var(--background)_88%,transparent),0_0_22px_color-mix(in_oklab,var(--background)_62%,transparent)] sm:min-h-[10.5rem] sm:text-left sm:leading-[1.18] md:min-h-[9.5rem] md:text-[clamp(2.1rem,4.2vw,3.65rem)] lg:min-h-[8.75rem]',
        className
      )}
      aria-label={ariaLabel}
      aria-live="polite"
    >
      {HERO_HEADLINES.map((line, idx) => (
        <span
          key={line}
          className={cn(
            'absolute inset-x-0 top-0 text-pretty text-foreground transition-[opacity,transform] duration-[580ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
            idx === i
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-1.5 opacity-0'
          )}
        >
          {line}
        </span>
      ))}
    </h1>
  )
}

type HeroSectionProps = {
  children: ReactNode
}

export function HeroSection({ children }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/70 bg-background">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 text-primary">
          <FlickeringGrid
            className="absolute inset-0 opacity-[0.72] sm:opacity-80"
            squareSize={4}
            gridGap={6}
            flickerChance={0.32}
            color="currentColor"
            maxOpacity={0.34}
            interactive
            mouseInfluenceRadius={220}
          />
        </div>
        <div
          className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_118%_68%_at_50%_36%,color-mix(in_oklab,var(--background)_78%,transparent)_0%,color-mix(in_oklab,var(--background)_42%,transparent)_45%,transparent_74%)]"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 md:pb-32 md:pt-32">
        <div className="mx-auto max-w-4xl sm:mx-0">
          <HeroHeadline />
        </div>

        <div className="mt-8 max-w-2xl sm:mt-9 [&_p]:text-muted-foreground">{children}</div>
      </div>
    </section>
  )
}
