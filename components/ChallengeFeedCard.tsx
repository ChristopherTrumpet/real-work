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
      "group relative overflow-hidden border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_2rem_-0.5rem_rgba(var(--primary),0.15)]",
      isSm ? "rounded-2xl" : "rounded-3xl",
      isLg ? "sm:h-[260px]" : "flex flex-col h-full"
    )}>
      <div className={cn(
        "flex h-full flex-col",
        isLg ? "sm:flex-row sm:gap-8 sm:p-7 p-5" : isSm ? "p-3" : isMd ? "p-4" : "p-5"
      )}>
        {/* Visual Preview */}
        <div className={cn(
          "relative shrink-0 overflow-hidden bg-muted",
          isLg && "aspect-video w-full rounded-2xl sm:h-full sm:w-80",
          !isLg && isMd && "aspect-[2.4/1] w-full mb-3 rounded-2xl",
          !isLg && isSm && "mb-2 h-[6.5rem] w-full rounded-xl sm:h-[7rem]"
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
          <div className={cn('absolute left-2 top-2', isSm && 'left-1.5 top-1.5')}>
            <span className={cn(
              "inline-flex items-center rounded-full border font-bold uppercase tracking-wider backdrop-blur-md transition-colors",
              isSm ? "px-2 py-px text-[9px]" : "px-2.5 py-0.5 text-[10px]",
              diffStyles
            )}>
              {diff}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className={cn('flex min-w-0 flex-1 flex-col', isSm ? 'py-0' : 'py-0.5')}>
          <div className={cn('flex-1', isSm ? 'space-y-2' : 'space-y-3')}>
            <div className={cn(isSm ? 'space-y-0.5' : 'space-y-1')}>
              <Link
                href={`/challenge/${container.id}`}
                className={cn(
                  "inline-flex max-w-full items-center gap-1.5 font-bold tracking-tight text-foreground transition-all hover:text-primary group/title",
                  isLg ? "text-2xl" : isSm ? "text-[0.95rem] leading-snug sm:text-base" : "text-xl"
                )}
              >
                <span className="truncate">{container.title}</span>
                <ArrowUpRight className={cn('shrink-0 opacity-0 transition-all group-hover/title:translate-x-0 group-hover/title:translate-y-0 group-hover/title:opacity-100 -translate-y-0.5 translate-x-0.5', isSm ? 'size-3.5' : 'size-4')} />
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

            <div className={cn('flex flex-wrap gap-1.5 overflow-hidden', isSm ? 'h-5' : 'h-6 gap-2')}>
              {container.tags && container.tags.slice(0, isSm ? 2 : 3).map((tag: string, i: number) => (
                <span
                  key={i}
                  className={cn(
                    'rounded-full bg-muted/50 font-semibold text-muted-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary',
                    isSm ? 'px-2 py-px text-[9px]' : 'px-3 py-0.5 text-[10px]'
                  )}
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className={cn(
              'flex flex-wrap items-center font-semibold text-muted-foreground/60',
              isSm ? 'gap-3 text-[11px]' : 'gap-5 text-xs'
            )}>
              <span className="inline-flex items-center gap-1.5">
                <Star className={cn('text-amber-500 fill-amber-500', isSm ? 'size-3' : 'size-3.5')} />
                <span className="text-foreground">{container.average_rating != null ? Number(container.average_rating).toFixed(1) : '—'}</span>
                {!isSm && <span>({container.ratings_count ?? 0})</span>}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className={cn('text-primary/80', isSm ? 'size-3' : 'size-3.5')} />
                <span className="text-foreground">{(container.number_of_completions ?? 0).toLocaleString()}</span>
                {!isSm && <span>completions</span>}
              </span>
            </div>
          </div>

          <div className={cn(
            'flex items-center justify-between gap-3 border-t border-border/50',
            isSm ? 'mt-3 flex-col pt-3 sm:flex-row sm:items-center' : 'mt-4 gap-4 pt-4',
            !isLg && !isSm ? 'flex-col sm:flex-row items-stretch sm:items-center' : '',
            isLg && 'flex-row'
          )}>
            <div className={cn('flex items-center', isSm ? 'gap-2' : 'gap-3')}>
              {container.profiles?.username ? (
                <Link
                  href={`/u/${encodeURIComponent(container.profiles.username)}`}
                  className={cn('group/author flex items-center transition-opacity hover:opacity-80', isSm ? 'gap-2' : 'gap-2.5')}
                >
                  <div className={cn(
                    'relative shrink-0 overflow-hidden rounded-full border border-border/50 bg-muted',
                    isSm ? 'size-7' : 'size-8'
                  )}>
                    {container.profiles.avatar_url ? (
                      <img src={container.profiles.avatar_url} alt={container.profiles.username} className="h-full w-full object-cover" />
                    ) : (
                      <div className={cn('flex h-full w-full items-center justify-center font-bold text-muted-foreground', isSm ? 'text-[9px]' : 'text-[10px]')}>
                        {(container.profiles.username[0] || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className={cn('truncate font-bold text-foreground', isSm ? 'text-[11px]' : 'text-xs')}>
                      {container.profiles?.full_name || container.profiles.username}
                    </span>
                    {!isSm && <span className="text-[10px] text-muted-foreground/60">@{container.profiles.username}</span>}
                  </div>
                </Link>
              ) : (
                <div className={cn('flex items-center', isSm ? 'gap-2' : 'gap-2.5')}>
                   <div className={cn(
                     'flex shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted',
                     isSm ? 'size-7' : 'size-8'
                   )}>
                    <User className={cn('text-muted-foreground/40', isSm ? 'size-3.5' : 'size-4')} />
                  </div>
                  <span className={cn('font-bold text-muted-foreground', isSm ? 'text-[11px]' : 'text-xs')}>Anonymous</span>
                </div>
              )}
            </div>

            <div className={cn(
              'flex items-center gap-2',
              !isLg && !isSm && 'mt-2 justify-end sm:mt-0',
              isSm && 'w-full justify-end sm:w-auto'
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
                      className={cn(
                        'inline-flex cursor-pointer items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95',
                        isSm ? 'h-8 px-4 text-[11px]' : 'h-9 px-5 text-xs'
                      )}
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
                  className={cn(
                    'inline-flex cursor-pointer items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95',
                    isSm ? 'h-8 px-4 text-[11px]' : 'h-9 px-5 text-xs'
                  )}
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
