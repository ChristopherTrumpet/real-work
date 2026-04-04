import { Suspense } from 'react'
import SearchClient from './SearchClient'

export default function SearchPage() {
  return (
    <main className="min-h-[60vh] bg-background">
      <Suspense
        fallback={
          <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground text-sm">Loading search…</div>
        }
      >
        <SearchClient />
      </Suspense>
    </main>
  )
}
