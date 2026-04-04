'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function HeaderMaxWidthContainer({ children, className }: { children: React.ReactNode, className?: string }) {
  const pathname = usePathname()
  // Wide pages: /studio and /preview
  const isWide = pathname?.startsWith('/studio') || pathname?.startsWith('/preview')
  
  return (
    <div className={cn("mx-auto flex h-14 items-center justify-between gap-4 px-4 sm:px-6", isWide ? "w-full max-w-none" : "max-w-6xl", className)}>
      {children}
    </div>
  )
}
