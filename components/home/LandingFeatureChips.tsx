'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'

const ITEMS = [
  { label: 'Live containers', hint: 'Real Docker workspaces per challenge' },
  { label: 'Save & resume', hint: 'Pick up where you left off' },
  { label: 'Community ratings', hint: 'Find quality by star score' },
  { label: 'Benchmarks', hint: 'Optional automated checks' },
] as const

export function LandingFeatureChips({ className }: { className?: string }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <ul className={cn('mt-5 flex flex-wrap justify-center gap-1.5 sm:justify-start', className)}>
      {ITEMS.map((item, i) => {
        const isOn = open === i
        return (
          <li key={item.label}>
            <button
              type="button"
              className={cn(
                'rounded-md border px-2.5 py-1 text-[11px] font-medium tracking-wide transition-all duration-200',
                'border-border/80 bg-background/80 text-muted-foreground backdrop-blur-sm',
                'hover:border-primary/30 hover:text-foreground hover:shadow-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isOn && 'border-primary/40 bg-primary/5 text-foreground'
              )}
              onMouseEnter={() => setOpen(i)}
              onMouseLeave={() => setOpen(null)}
              onFocus={() => setOpen(i)}
              onBlur={() => setOpen(null)}
              aria-expanded={isOn}
            >
              <span className="tabular-nums">{item.label}</span>
            </button>
            <span className="sr-only">{item.hint}</span>
          </li>
        )
      })}
    </ul>
  )
}
