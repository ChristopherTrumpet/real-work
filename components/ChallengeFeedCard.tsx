import Link from 'next/link'
import { deployContainer } from '@/app/actions/docker'
import { ResetProgressButton } from './ResetProgressButton'

type Profile = { username: string | null; full_name: string | null; avatar_url?: string | null } | null

export type ChallengeFeedItem = {
  id: string
  user_id: string
  title: string
  description: string | null
  difficulty: string | null
  content_url: string | null
  tags: string[] | null
  average_rating: number | null
  ratings_count: number | null
  number_of_completions: number | null
  thumbnail_url?: string | null
  profiles: Profile
}

export function ChallengeFeedCard({
  container,
  userId,
  hasSession,
}: {
  container: ChallengeFeedItem
  userId: string | undefined
  hasSession: boolean
}) {
  const diff = container.difficulty || 'medium'
  const diffClass =
    diff === 'easy'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : diff === 'hard'
        ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
      <div className="flex flex-col gap-5 p-6 sm:flex-row">
        {container.thumbnail_url && (
          <div className="aspect-video w-full shrink-0 self-start overflow-hidden rounded-xl border border-border bg-muted sm:w-56 md:w-64">
            <img
              src={container.thumbnail_url}
              alt={container.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 gap-y-2">
                <Link
                  href={`/challenge/${container.id}`}
                  className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary md:text-xl"
                >
                  {container.title}
                </Link>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${diffClass}`}
                >
                  {diff}
                </span>
              </div>
              {container.description && (
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{container.description}</p>
              )}
              {container.tags && container.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {container.tags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="size-3.5 shrink-0 text-primary/80" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {container.average_rating != null ? Number(container.average_rating).toFixed(1) : '—'} ·{' '}
                  {container.ratings_count ?? 0} ratings
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="size-3.5 shrink-0 text-primary/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {(container.number_of_completions ?? 0).toLocaleString()} completions
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
              {hasSession ? (
                <>
                  <form action={deployContainer} className="min-w-[7.5rem]">
                    <input type="hidden" name="image" value={container.content_url ?? ''} />
                    <input type="hidden" name="postId" value={container.id} />
                    {userId && <input type="hidden" name="userId" value={userId} />}
                    <input type="hidden" name="actionType" value="resume" />
                    <button
                      type="submit"
                      className="w-full cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      Resume
                    </button>
                    </form>
                    {userId && (
                    <ResetProgressButton 
                      postId={container.id} 
                      userId={userId} 
                      className="w-full cursor-pointer rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
                    />
                    )}
                    </>
                    ) : (                    <Link
                    href={`/challenge/${container.id}`}
                    className="inline-flex min-w-[7.5rem] cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                    Open Challenge
                    </Link>
                    )}            </div>
          </div>

          <footer className="mt-6 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {container.profiles?.username ? (
                <Link
                  href={`/u/${encodeURIComponent(container.profiles.username)}`}
                  className="flex items-center gap-2 group/author shrink-0"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground transition-colors group-hover/author:bg-primary/10 group-hover/author:text-primary">
                    {container.profiles.avatar_url ? (
                      <img src={container.profiles.avatar_url} alt={container.profiles.username} className="h-full w-full object-cover" />
                    ) : (
                      (container.profiles.username[0] || 'U').toUpperCase()
                    )}
                  </div>
                  <span className="truncate text-sm font-medium text-muted-foreground transition-colors group-hover/author:text-primary">
                    {container.profiles?.full_name || container.profiles.username}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    U
                  </div>
                  <span className="truncate text-sm font-medium text-muted-foreground">
                    {container.profiles?.full_name || 'Anonymous'}
                  </span>
                </div>
              )}
            </div>            {container.content_url && (
              <code className="hidden max-w-[220px] truncate rounded-md bg-muted/80 px-2 py-1 font-mono text-[10px] text-muted-foreground sm:block">
                {container.content_url}
              </code>
            )}
          </footer>
        </div>
      </div>
    </article>
  )
}
