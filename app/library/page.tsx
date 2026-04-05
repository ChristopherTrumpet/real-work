import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import LibraryClient from './LibraryClient'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-background pt-16">
      <Suspense fallback={
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-12">
            <div className="h-10 w-64 animate-pulse rounded-lg bg-muted/50" />
            <div className="mt-4 h-6 w-96 animate-pulse rounded-lg bg-muted/50" />
          </div>
          <div className="flex flex-col gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted/50" />
            ))}
          </div>
        </div>
      }>
        <LibraryClient initialUserId={user?.id} />
      </Suspense>
    </main>
  )
}
