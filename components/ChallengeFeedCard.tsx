import Link from 'next/link'
import { deployContainer } from '@/app/actions/docker'
import { ResetProgressButton } from './ResetProgressButton'
import { ArrowUpRight, Star, CheckCircle2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  size = 'md'
}: {
  container: ChallengeFeedItem
  userId: string | undefined
  hasSession: boolean
  size?: 'lg' | 'md' | 'sm'
}) {
  const diff = container.difficulty || 'medium'
  
  const diffStyles = {
    easy: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    hard: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
  }[diff as 'easy' | 'medium' | 'hard'] || 'text-amber-500 bg-amber-500/10 border-amber-500/20'

  const isLg = size === 'lg'
  const isMd = size === 'md'
  const isSm = size === 'sm'

  return (
    <article className={cn(
      "group relative overflow-hidden rounded-3xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_2rem_-0.5rem_rgba(var(--primary),0.15)]",
      isLg ? "sm:h-[260px]" : "flex flex-col h-full"
    )}>
      <div className={cn(
        "flex h-full flex-col",
        isLg ? "sm:flex-row sm:gap-8 sm:p-7 p-5" : (isSm || isMd ? "p-4" : "p-5")
      )}>
        {/* Visual Preview */}
        <div className={cn(
          "relative shrink-0 overflow-hidden rounded-2xl bg-muted",
          isLg ? "aspect-video w-full sm:h-full sm:w-80" : (isMd ? "aspect-[2.4/1] w-full mb-3" : "aspect-video w-full mb-4")
        )}>
          {container.thumbnail_url ? (
            <img
              src={container.thumbnail_url}
              alt={container.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
               <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
               <span className="text-[10px] font-bold uppercase tracking-widest text-primary/20">No Preview</span>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md transition-colors",
              diffStyles
            )}>
              {diff}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col min-w-0 py-0.5">
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <Link
                href={`/challenge/${container.id}`}
                className={cn(
                  "inline-flex max-w-full items-center gap-2 font-bold tracking-tight text-foreground transition-all hover:text-primary group/title",
                  isLg ? "text-2xl" : (isSm ? "text-lg" : "text-xl")
                )}
              >
                <span className="truncate">{container.title}</span>
                <ArrowUpRight className="size-4 shrink-0 opacity-0 -translate-y-1 translate-x-1 transition-all group-hover/title:opacity-100 group-hover/title:translate-y-0 group-hover/title:translate-x-0" />
              </Link>
              
              {!isSm && (
                <p className={cn(
                  "min-h-[1.25rem] max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground",
                  isLg ? "line-clamp-2" : (isMd ? "line-clamp-1" : "line-clamp-2")
                )}>
                  {container.description || "\u00A0"}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 overflow-hidden h-6">
              {container.tags && container.tags.slice(0, isSm ? 2 : 3).map((tag: string, i: number) => (
                <span
                  key={i}
                  className="rounded-full bg-muted/50 px-3 py-0.5 text-[10px] font-semibold text-muted-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-muted-foreground/60">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-3.5 text-amber-500 fill-amber-500" />
                <span className="text-foreground">{container.average_rating != null ? Number(container.average_rating).toFixed(1) : '—'}</span>
                {!isSm && <span>({container.ratings_count ?? 0})</span>}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-primary/80" />
                <span className="text-foreground">{(container.number_of_completions ?? 0).toLocaleString()}</span>
                {!isSm && <span>completions</span>}
              </span>
            </div>
          </div>

          <div className={cn(
            "mt-4 flex items-center justify-between gap-4 border-t border-border/50 pt-4",
            !isLg ? "flex-col sm:flex-row items-stretch sm:items-center" : "flex-row"
          )}>
            <div className="flex items-center gap-3">
              {container.profiles?.username ? (
                <Link
                  href={`/u/${encodeURIComponent(container.profiles.username)}`}
                  className="group/author flex items-center gap-2.5 transition-opacity hover:opacity-80"
                >
                  <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-border/50 bg-muted">
                    {container.profiles.avatar_url ? (
                      <img src={container.profiles.avatar_url} alt={container.profiles.username} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {(container.profiles.username[0] || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs font-bold text-foreground">
                      {container.profiles?.full_name || container.profiles.username}
                    </span>
                    {!isSm && <span className="text-[10px] text-muted-foreground/60">@{container.profiles.username}</span>}
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-2.5">
                   <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted">
                    <User className="size-4 text-muted-foreground/40" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">Anonymous</span>
                </div>
              )}
            </div>

            <div className={cn(
              "flex items-center gap-2",
              !isLg && "justify-end mt-2 sm:mt-0"
            )}>
              {hasSession ? (
                <div className="flex items-center gap-2">
                  <form action={deployContainer}>
                    <input type="hidden" name="image" value={container.content_url ?? ''} />
                    <input type="hidden" name="postId" value={container.id} />
                    {userId && <input type="hidden" name="userId" value={userId} />}
                    <input type="hidden" name="actionType" value="resume" />
                    <button
                      type="submit"
                      className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
                    >
                      Resume
                    </button>
                  </form>
                  {userId && !isSm && (
                    <ResetProgressButton 
                      postId={container.id} 
                      userId={userId} 
                      className="h-9 cursor-pointer rounded-full border border-border bg-background px-4 text-xs font-bold text-muted-foreground transition-all hover:bg-muted"
                    />
                  )}
                </div>
              ) : (
                <Link
                  href={`/challenge/${container.id}`}
                  className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
                >
                  Start Challenge
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
