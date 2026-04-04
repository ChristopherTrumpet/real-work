'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { escapeIlikePattern } from '@/lib/search'

type Scope = 'all' | 'profiles' | 'containers'
type Difficulty = 'all' | 'easy' | 'medium' | 'hard'

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
  profiles: { username: string | null; full_name: string | null } | null
}

export default function SearchClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [scope, setScope] = useState<Scope>(() => {
    const s = searchParams.get('scope') as Scope | null
    return s === 'profiles' || s === 'containers' ? s : 'all'
  })
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const d = searchParams.get('difficulty') as Difficulty | null
    return d === 'easy' || d === 'medium' || d === 'hard' ? d : 'all'
  })

  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [containers, setContainers] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(false)

  const syncUrl = useCallback(() => {
    const p = new URLSearchParams()
    const trimmed = q.trim()
    if (trimmed) p.set('q', trimmed)
    if (scope !== 'all') p.set('scope', scope)
    if (scope !== 'profiles' && difficulty !== 'all') p.set('difficulty', difficulty)
    const qs = p.toString()
    router.replace(qs ? `/search?${qs}` : '/search', { scroll: false })
  }, [q, scope, difficulty, router])

  useEffect(() => {
    const t = setTimeout(syncUrl, 280)
    return () => clearTimeout(t)
  }, [syncUrl])

  useEffect(() => {
    let cancelled = false
    const term = q.trim()
    if (!term) {
      setProfiles([])
      setContainers([])
      return
    }

    const run = async () => {
      setLoading(true)
      const supabase = createClient()
      const inner = escapeIlikePattern(term)
      const pat = `%${inner}%`

      try {
        if (scope === 'profiles' || scope === 'all') {
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

        if (scope === 'containers' || scope === 'all') {
          let query = supabase
            .from('posts')
            .select('id, title, description, difficulty, content_url, tags, profiles!user_id(username, full_name)')
            .or(`title.ilike.${pat},description.ilike.${pat}`)
          if (difficulty !== 'all') {
            query = query.eq('difficulty', difficulty)
          }
          const { data, error } = await query.order('created_at', { ascending: false }).limit(50)
          if (!cancelled) {
            if (error) console.error(error)
            const rows = (data ?? []).map((row) => {
              const pr = row.profiles
              const prof = Array.isArray(pr) ? pr[0] : pr
              return {
                ...row,
                profiles: prof as PostRow['profiles'],
              } as PostRow
            })
            setContainers(rows)
          }
        } else if (!cancelled) {
          setContainers([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [q, scope, difficulty])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Search</h1>

      <div className="space-y-4 mb-8">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, username, challenge title…"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none"
          autoComplete="off"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Show</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'All'],
                ['profiles', 'Profiles'],
                ['containers', 'Containers'],
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

        {(scope === 'containers' || scope === 'all') && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center border-t border-border pt-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Challenge difficulty
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
        )}
      </div>

      {!q.trim() && (
        <p className="text-sm text-muted-foreground text-center py-12">Type a query to search profiles and challenges.</p>
      )}

      {q.trim() && loading && (
        <p className="text-sm text-muted-foreground text-center py-8">Searching…</p>
      )}

      {q.trim() && !loading && (
        <div className="space-y-10">
          {(scope === 'all' || scope === 'profiles') && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-foreground">
                Profiles <span className="text-muted-foreground font-normal">({profiles.length})</span>
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
                          className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
                        >
                          <span className="font-medium text-foreground">{p.full_name || p.username}</span>
                          <span className="text-muted-foreground text-sm ml-2">@{p.username}</span>
                          {p.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.bio}</p>}
                        </Link>
                      ) : (
                        <div className="rounded-xl border border-border bg-card p-4">
                          <span className="font-medium text-foreground">{p.full_name || 'User'}</span>
                          {p.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.bio}</p>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {(scope === 'all' || scope === 'containers') && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-foreground">
                Challenges <span className="text-muted-foreground font-normal">({containers.length})</span>
              </h2>
              {containers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching challenges.</p>
              ) : (
                <ul className="space-y-2">
                  {containers.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/challenge/${c.id}`}
                        className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-foreground">{c.title}</span>
                          <span className="text-[10px] uppercase font-bold shrink-0 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                            {c.difficulty || 'medium'}
                          </span>
                        </div>
                        {c.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          by {c.profiles?.full_name || c.profiles?.username || 'Unknown'}
                        </p>
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
