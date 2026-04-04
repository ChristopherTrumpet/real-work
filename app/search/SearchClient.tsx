'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { escapeIlikePattern } from '@/lib/search'

type Scope = 'all' | 'profiles' | 'challenges'
type Difficulty = 'all' | 'easy' | 'medium' | 'hard'
type ChallengeSort = 'latest' | 'ranking'

function parseScope(raw: string | null): Scope {
  if (raw === 'profiles') return 'profiles'
  if (raw === 'challenges' || raw === 'containers') return 'challenges'
  return 'all'
}

type ProfileRow = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
}

type PostRow = {
  id: string
  title: string
  description: string | null
  difficulty: string | null
  content_url: string | null
  tags: string[] | null
  created_at: string
  number_of_completions: number | null
  average_rating: number | null
  ratings_count: number | null
  profiles: { username: string | null; full_name: string | null } | null
}

export default function SearchClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [scope, setScope] = useState<Scope>(() => parseScope(searchParams.get('scope')))
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const d = searchParams.get('difficulty') as Difficulty | null
    return d === 'easy' || d === 'medium' || d === 'hard' ? d : 'all'
  })
  const [sort, setSort] = useState<ChallengeSort>(() =>
    searchParams.get('sort') === 'ranking' ? 'ranking' : 'latest'
  )
  const [tag, setTag] = useState(() => searchParams.get('tag') ?? '')

  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [challenges, setChallenges] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(false)

  const syncUrl = useCallback(() => {
    const p = new URLSearchParams()
    const trimmed = q.trim()
    if (trimmed) p.set('q', trimmed)
    if (scope !== 'all') p.set('scope', scope === 'challenges' ? 'challenges' : scope)
    if ((scope === 'challenges' || scope === 'all') && difficulty !== 'all') p.set('difficulty', difficulty)
    if ((scope === 'challenges' || scope === 'all') && sort !== 'latest') p.set('sort', sort)
    if ((scope === 'challenges' || scope === 'all') && tag.trim()) p.set('tag', tag.trim())
    const qs = p.toString()
    router.replace(qs ? `/search?${qs}` : '/search', { scroll: false })
  }, [q, scope, difficulty, sort, tag, router])

  useEffect(() => {
    const t = setTimeout(syncUrl, 280)
    return () => clearTimeout(t)
  }, [syncUrl])

  useEffect(() => {
    let cancelled = false
    const term = q.trim()
    const tagTrim = tag.trim().toLowerCase()

    const normalizePostRow = (row: Record<string, unknown>): PostRow => {
      const pr = row.profiles
      const prof = Array.isArray(pr) ? pr[0] : pr
      return {
        ...row,
        profiles: prof as PostRow['profiles'],
      } as PostRow
    }

    const run = async () => {
      setLoading(true)
      const supabase = createClient()

      try {
        if (term && (scope === 'profiles' || scope === 'all')) {
          const inner = escapeIlikePattern(term)
          const pat = `%${inner}%`
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, bio')
            .or(`username.ilike.${pat},full_name.ilike.${pat}`)
            .limit(50)
          if (!cancelled) {
            if (error) console.error(error)
            setProfiles((data as ProfileRow[]) ?? [])
          }
        } else if (!cancelled) {
          setProfiles([])
        }

        if (scope === 'challenges' || scope === 'all') {
          let query = supabase
            .from('posts')
            .select(
              'id, title, description, difficulty, content_url, tags, created_at, number_of_completions, average_rating, ratings_count, profiles!user_id(username, full_name)'
            )

          if (term) {
            const inner = escapeIlikePattern(term)
            const pat = `%${inner}%`
            query = query.or(`title.ilike.${pat},description.ilike.${pat}`)
          }

          if (difficulty !== 'all') {
            query = query.eq('difficulty', difficulty)
          }

          if (sort === 'latest') {
            query = query.order('created_at', { ascending: false })
          } else {
            query = query
              .order('average_rating', { ascending: false, nullsFirst: false })
              .order('number_of_completions', { ascending: false })
          }

          const fetchLimit = term || tagTrim ? 120 : 80
          const { data, error } = await query.limit(fetchLimit)
          if (!cancelled) {
            if (error) console.error(error)
            let rows = (data ?? []).map((row) => normalizePostRow(row as Record<string, unknown>))
            if (tagTrim) {
              rows = rows.filter((r) => r.tags?.some((x) => x.toLowerCase() === tagTrim))
            }
            setChallenges(rows.slice(0, 50))
          }
        } else if (!cancelled) {
          setChallenges([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [q, scope, difficulty, sort, tag])

  const showChallengeFilters = scope === 'challenges' || scope === 'all'
  const term = q.trim()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Search</h1>

      <div className="mb-8 space-y-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, username, challenge title…"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          autoComplete="off"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Show</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'All'],
                ['profiles', 'Profiles'],
                ['challenges', 'Challenges'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  scope === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {showChallengeFilters && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Sort
              </span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['latest', 'Latest'],
                    ['ranking', 'Ranking'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSort(value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      sort === value
                        ? 'bg-secondary text-secondary-foreground ring-1 ring-border'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <label htmlFor="search-tag" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase shrink-0">
                Tags
              </label>
              <input
                id="search-tag"
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. docker (matches one tag, case-insensitive)"
                className="h-10 w-full min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Difficulty
              </span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', 'Any'],
                    ['easy', 'Easy'],
                    ['medium', 'Medium'],
                    ['hard', 'Hard'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDifficulty(value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      difficulty === value
                        ? 'bg-secondary text-secondary-foreground ring-1 ring-border'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {term ? 'Searching…' : 'Loading…'}
        </p>
      ) : (
        <div className="space-y-10">
          {scope === 'profiles' && !term && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Type a query to search profiles.
            </p>
          )}

          {term && (scope === 'all' || scope === 'profiles') && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                Profiles <span className="font-normal text-muted-foreground">({profiles.length})</span>
              </h2>
              {profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching profiles.</p>
              ) : (
                <ul className="space-y-2">
                  {profiles.map((p) => (
                    <li key={p.id}>
                      {p.username ? (
                        <Link
                          href={`/u/${encodeURIComponent(p.username)}`}
                          className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                        >
                          <span className="font-medium text-foreground">{p.full_name || p.username}</span>
                          <span className="ml-2 text-sm text-muted-foreground">@{p.username}</span>
                          {p.bio && (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>
                          )}
                        </Link>
                      ) : (
                        <div className="rounded-xl border border-border bg-card p-4">
                          <span className="font-medium text-foreground">{p.full_name || 'User'}</span>
                          {p.bio && (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {(scope === 'all' || scope === 'challenges') && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                Challenges{' '}
                <span className="font-normal text-muted-foreground">({challenges.length})</span>
              </h2>
              {challenges.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {term ? 'No matching challenges.' : 'No challenges yet.'}
                </p>
              ) : (
                <ul className="space-y-2">
                  {challenges.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/challenge/${c.id}`}
                        className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-foreground">{c.title}</span>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                            {c.difficulty || 'medium'}
                          </span>
                        </div>
                        {c.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>by {c.profiles?.full_name || c.profiles?.username || 'Unknown'}</span>
                          {c.average_rating != null && (
                            <span>
                              ★ {c.average_rating.toFixed(1)}
                              {c.ratings_count != null && c.ratings_count > 0
                                ? ` (${c.ratings_count})`
                                : ''}
                            </span>
                          )}
                          {c.number_of_completions != null && c.number_of_completions > 0 && (
                            <span>{c.number_of_completions} completions</span>
                          )}
                        </div>
                        {c.tags && c.tags.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {c.tags.map((t) => (
                              <span key={t} className="mr-2 inline-block rounded-md bg-muted/80 px-2 py-0.5">
                                {t}
                              </span>
                            ))}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
