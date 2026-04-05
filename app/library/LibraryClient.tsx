'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ChallengeFeedCard, type ChallengeFeedItem } from '@/components/ChallengeFeedCard'
import Link from 'next/link'
import { escapeIlikePattern } from '@/lib/search'

type PostRow = ChallengeFeedItem & {
  profiles: { username: string | null; full_name: string | null; avatar_url: string | null } | null
}

type Difficulty = 'all' | 'easy' | 'medium' | 'hard'
type ChallengeSort = 'latest' | 'ranking'

export default function LibraryClient({ initialUserId }: { initialUserId?: string }) {
  const [challenges, setChallenges] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 12

  // Search and Filter State
  const [q, setQ] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('all')
  const [sort, setSort] = useState<ChallengeSort>('latest')
  const [tag, setTag] = useState('')

  const fetchChallenges = useCallback(async (pageNumber: number, currentFilters: { q: string, difficulty: Difficulty, sort: ChallengeSort, tag: string }) => {
    const supabase = createClient()
    const from = pageNumber * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('posts')
      .select('*, profiles!user_id(username, full_name, avatar_url)')

    const term = currentFilters.q.trim()
    if (term) {
      const inner = escapeIlikePattern(term)
      const pat = `%${inner}%`
      query = query.or(`title.ilike.${pat},description.ilike.${pat}`)
    }

    if (currentFilters.difficulty !== 'all') {
      query = query.eq('difficulty', currentFilters.difficulty)
    }

    const tagTrim = currentFilters.tag.trim().toLowerCase()
    if (tagTrim) {
      // Supabase filter for array contains is .contains('tags', [tag])
      query = query.contains('tags', [tagTrim])
    }

    if (currentFilters.sort === 'latest') {
      query = query.order('created_at', { ascending: false })
    } else {
      query = query
        .order('average_rating', { ascending: false, nullsFirst: false })
        .order('number_of_completions', { ascending: false })
    }

    const { data, error } = await query.range(from, to)

    if (error) {
      console.error('Error fetching challenges:', error)
      return []
    }

    return data as PostRow[]
  }, [])

  const initialLoad = useCallback(async () => {
    setLoading(true)
    const data = await fetchChallenges(0, { q, difficulty, sort, tag })
    setChallenges(data)
    setHasMore(data.length === PAGE_SIZE)
    setPage(0)
    setLoading(false)
  }, [fetchChallenges, q, difficulty, sort, tag])

  // Debounce search input
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void initialLoad()
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [initialLoad])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    const data = await fetchChallenges(nextPage, { q, difficulty, sort, tag })
    setChallenges((prev) => [...prev, ...data])
    setPage(nextPage)
    setHasMore(data.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  const selectClass =
    'h-10 w-full min-w-[10rem] cursor-pointer rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Challenge Library</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Browse our complete collection of interactive engineering challenges.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-10 space-y-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search challenges by title or description…"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
          autoComplete="off"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-border pt-6">
          <div className="space-y-1.5">
            <label htmlFor="lib-sort" className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Sort By
            </label>
            <select
              id="lib-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as ChallengeSort)}
              className={selectClass}
            >
              <option value="latest">Latest</option>
              <option value="ranking">Top Rated</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="lib-difficulty" className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Difficulty
            </label>
            <select
              id="lib-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className={selectClass}
            >
              <option value="all">Any Difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="lib-tag" className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Filter Tag
            </label>
            <input
              id="lib-tag"
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. docker, rust..."
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted/50 w-full" />
          ))}
        </div>
      ) : challenges.length > 0 ? (
        <>
          <div className="flex flex-col gap-6">
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
                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-10 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-50 cursor-pointer"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading...
                  </span>
                ) : (
                  'Load More Challenges'
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-24 text-center">
          <p className="text-xl font-semibold text-foreground">No challenges found</p>
          <p className="mt-2 text-muted-foreground">Try adjusting your filters or search terms.</p>
          {(q || difficulty !== 'all' || tag) && (
            <button
              onClick={() => { setQ(''); setDifficulty('all'); setTag(''); }}
              className="mt-6 text-primary font-medium hover:underline cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
