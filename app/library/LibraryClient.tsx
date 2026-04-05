'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ChallengeFeedCard, type ChallengeFeedItem } from '@/components/ChallengeFeedCard'
import Link from 'next/link'

type PostRow = ChallengeFeedItem & {
  profiles: { username: string | null; full_name: string | null } | null
}

export default function LibraryClient({ initialUserId }: { initialUserId?: string }) {
  const [challenges, setChallenges] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 12

  const fetchChallenges = useCallback(async (pageNumber: number) => {
    const supabase = createClient()
    const from = pageNumber * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles!user_id(username, full_name)')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching challenges:', error)
      return []
    }

    return data as PostRow[]
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const data = await fetchChallenges(0)
      setChallenges(data)
      setHasMore(data.length === PAGE_SIZE)
      setLoading(false)
    }
    void init()
  }, [fetchChallenges])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    const data = await fetchChallenges(nextPage)
    setChallenges((prev) => [...prev, ...data])
    setPage(nextPage)
    setHasMore(data.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Challenge Library</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Browse our complete collection of interactive engineering challenges.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : challenges.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-1">
            {challenges.map((challenge) => (
              <ChallengeFeedCard
                key={challenge.id}
                container={challenge}
                userId={initialUserId}
                hasSession={false}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-12 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-8 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-20 text-center">
          <p className="text-lg font-medium text-foreground">No challenges found</p>
          <Link href="/new" className="mt-4 inline-flex text-primary hover:underline">
            Create the first one →
          </Link>
        </div>
      )}
    </div>
  )
}
