'use client'

import { useEffect, Suspense } from 'react'
import { usePathname } from 'next/navigation'

function ScrollToTopContent() {
  const pathname = usePathname()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default function ScrollToTop() {
  return (
    <Suspense fallback={null}>
      <ScrollToTopContent />
    </Suspense>
  )
}
