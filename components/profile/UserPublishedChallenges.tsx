'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { DeleteChallengeButton } from '@/components/profile/delete-challenge-button'

type Challenge = {
  id: string
  title: string
  difficulty: string | null
  created_at: string
  description: string | null
  number_of_completions: number | null
  average_rating: number | null
  ratings_count: number | null
  user_id: string
}

type UserPublishedChallengesProps = {
  initialChallenges: Challenge[]
  userId: string
  profileId: string
  isOwnProfile: boolean
}

const PAGE_SIZE = 10

export function UserPublishedChallenges({ initialChallenges, userId, profileId, isOwnProfile }: UserPublishedChallengesProps) {
  const [challenges, setChallenges] = useState(initialChallenges)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialChallenges.length === PAGE_SIZE)
  const [page, setPage] = useState(0)

  const fetchChallenges = useCallback(async (pageNumber: number) => {
    const supabase = createClient()
    const from = pageNumber * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error } = await supabase
      .from('posts')
      .select('id, title, description, difficulty, number_of_completions, average_rating, ratings_count, created_at, user_id')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching more challenges:', error)
      return []
    }
    return data as Challenge[]
  }, [profileId])

  useEffect(() => {
    // Reset state if initial challenges or profileId changes (e.g. navigating between profiles)
    setChallenges(initialChallenges)
    setHasMore(initialChallenges.length === PAGE_SIZE)
    setPage(0)
  }, [initialChallenges, profileId])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    const nextPage = page + 1
    const newChallenges = await fetchChallenges(nextPage)
    setChallenges((prev) => [...prev, ...newChallenges])
    setPage(nextPage)
    setHasMore(newChallenges.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  return (
    <section>
      <h2 className="text-xl font-bold text-foreground mb-4">Published challenges</h2>
      {challenges.length === 0 && !hasMore ? (
        <p className="text-sm text-muted-foreground">No challenges yet.</p>
      ) : (
        <ul className="space-y-3">
          {challenges.map((p) => {
            const diff = p.difficulty || 'medium'
            return (
              <li key={p.id}>
                <Link
                  href={`/challenge/${p.id}`}
                  className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-foreground">{p.title}</span>
                    <span className="text-[10px] uppercase font-bold shrink-0 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                      {diff}
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {p.number_of_completions ?? 0} solves · ★{' '}
                    {p.average_rating != null ? Number(p.average_rating).toFixed(1) : '—'}
                  </p>
                </Link>
                {isOwnProfile && (
                  <div className="flex justify-end mt-2">
                    <DeleteChallengeButton postId={p.id} title={p.title} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-card px-8 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-50 cursor-pointer"
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
    </section>
  )
}
