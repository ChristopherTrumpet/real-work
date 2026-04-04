'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ErrorContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || 'Sorry, something went wrong'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="max-w-md w-full p-8 bg-card border border-destructive/30 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
        <p className="text-foreground/90 mb-6">{message}</p>
        <Link
          href="/"
          className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm">
          Loading…
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  )
}
