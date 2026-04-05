'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'

type LandingHeroCTAsProps = {
  signedIn: boolean
  className?: string
}

const btnBase =
  'tap-scale inline-flex h-9 items-center justify-center px-4 text-[13px] font-semibold tracking-tight transition-[box-shadow,transform,border-color,background-color] duration-200 sm:h-9 sm:px-5'

export function LandingHeroCTAs({ signedIn, className }: LandingHeroCTAsProps) {
  return (
    <div className={cn('mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2.5', className)}>
      <Link
        href="/library"
        className={cn(
          btnBase,
          'w-full rounded-md bg-primary text-primary-foreground shadow-sm',
          'hover:shadow-md hover:brightness-[1.03] sm:w-auto'
        )}
      >
        Explore library
      </Link>
      {signedIn ? (
        <Link
          href="/new"
          className={cn(
            btnBase,
            'w-full rounded-md border border-border bg-background text-foreground',
            'hover:border-primary/35 hover:bg-muted/60 sm:w-auto'
          )}
        >
          Create challenge
        </Link>
      ) : (
        <Link
          href="/login"
          className={cn(
            btnBase,
            'w-full rounded-md border border-transparent bg-muted/80 text-foreground',
            'hover:bg-muted sm:w-auto'
          )}
        >
          Sign in to create
        </Link>
      )}
    </div>
  )
}
