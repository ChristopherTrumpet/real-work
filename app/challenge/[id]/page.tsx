import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { deployContainer } from '@/app/actions/docker'
import { CommentThread } from '@/components/CommentThread'
import { ResetProgressButton } from '@/components/ResetProgressButton'
import { ReadOnlyStarRating, ratingRowsToBreakdown } from '@/components/read-only-star-rating'
import { ArrowLeft, Rocket, Play, CheckCircle2, Terminal, Globe, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import fs from 'fs'
import path from 'path'

type PageProps = { params: Promise<{ id: string }> }

export default async function ChallengePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: post, error } = await supabase
    .from('posts')
    .select('*, profiles!user_id(username, full_name, avatar_url)')
    .eq('id', id)
    .maybeSingle()

  if (error || !post) {
    notFound()
  }

  const { data: rawComments } = await supabase
    .from('post_comments')
    .select('id, user_id, parent_id, body, created_at, profiles!user_id(username, full_name, avatar_url)')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  const flatComments =
    rawComments?.map((row) => {
      const p = row.profiles
      const profileRow = Array.isArray(p) ? p[0] : p
      return {
        id: row.id,
        user_id: row.user_id,
        parent_id: row.parent_id as string | null,
        body: row.body,
        created_at: row.created_at,
        profiles: profileRow as { username: string | null; full_name: string | null; avatar_url: string | null } | null,
      }
    }) ?? []

  const localPath =
    user && post ? path.join(process.cwd(), 'container_data', user.id, post.id) : null
  const hasSession = localPath ? fs.existsSync(localPath) : false

  const { data: userCompletion } = user
    ? await supabase
        .from('user_completions')
        .select('user_id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

  const canDiscuss = Boolean(user && userCompletion)

  const { data: ratingRows } = await supabase.from('post_ratings').select('rating').eq('post_id', id)
  const ratingBreakdown = ratingRowsToBreakdown(ratingRows ?? [])

  const author = post.profiles as { username: string | null; full_name: string | null; avatar_url: string | null } | null

  return (
    <div className="min-h-screen bg-background pb-12">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </Link>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-1 flex-col gap-8">
            <article className="overflow-hidden rounded-3xl border border-border bg-card/50 backdrop-blur-sm shadow-xl shadow-primary/5">
              {post.thumbnail_url && (
                <div className="aspect-video w-full border-b border-border bg-muted overflow-hidden">
                  <img
                    src={post.thumbnail_url}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
              )}
              <div className="p-6 sm:p-10">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-4">
                    <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Challenge Workspace
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                      {post.title}
                    </h1>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">Authored by</span>
                      {author?.username ? (
                        <Link 
                          href={`/u/${encodeURIComponent(author.username)}`}
                          className="group/author flex items-center gap-2"
                        >
                          <div className="relative size-8 overflow-hidden rounded-full border border-border bg-muted ring-primary/10 group-hover/author:ring-4 transition-all">
                            {author.avatar_url ? (
                              <img src={author.avatar_url} alt={author.username} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                                {author.username[0]}
                              </div>
                            )}
                          </div>
                          <span className="font-bold text-foreground group-hover/author:text-primary transition-colors">
                            {author.full_name || author.username}
                          </span>
                        </Link>
                      ) : (
                        <span className="font-bold text-foreground">Anonymous</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md",
                      post.difficulty === 'easy'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : post.difficulty === 'hard'
                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    )}
                  >
                    {post.difficulty || 'medium'}
                  </span>
                </div>

                {post.description && (
                  <div className="mt-8 border-t border-border/50 pt-8">
                    <p className="text-lg leading-relaxed text-foreground/80 whitespace-pre-wrap font-medium">
                      {post.description}
                    </p>
                  </div>
                )}

                {post.tags && post.tags.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-2">
                    {post.tags.map((tag: string, i: number) => (
                      <span key={i} className="rounded-full bg-muted/50 px-4 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-tight transition-colors hover:bg-primary/10 hover:text-primary">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {user && (
                  <div className="mt-10 flex flex-col gap-6 border-t border-border/50 pt-10 sm:flex-row sm:items-center">
                    <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
                      {userCompletion ? (
                        <Button asChild size="lg" variant="secondary" className="h-12 px-6 font-bold">
                          <Link href={`/challenge/${post.id}/complete`}>
                            <CheckCircle2 className="mr-2 size-5 text-emerald-600 dark:text-emerald-400" />
                            Rating &amp; feedback
                          </Link>
                        </Button>
                      ) : null}
                      {hasSession ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <form action={deployContainer}>
                            <input type="hidden" name="image" value={post.content_url ?? ''} />
                            <input type="hidden" name="postId" value={post.id} />
                            <input type="hidden" name="userId" value={user.id} />
                            <input type="hidden" name="actionType" value="resume" />
                            <Button
                              type="submit"
                              size="lg"
                              className="h-14 px-8 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <Play className="mr-2 size-5 fill-current" />
                              Resume Workspace
                            </Button>
                          </form>
                          <ResetProgressButton 
                            postId={post.id} 
                            userId={user.id} 
                            className="h-14 px-6 rounded-md font-bold text-muted-foreground transition-all hover:bg-muted"
                          />
                        </div>
                      ) : (
                        <form action={deployContainer} className="w-full sm:w-auto">
                          <input type="hidden" name="image" value={post.content_url ?? ''} />
                          <input type="hidden" name="postId" value={post.id} />
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="actionType" value="launch" />
                          <Button
                            type="submit"
                            size="lg"
                            className="h-14 w-full px-10 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
                          >
                            <Rocket className="mr-2 size-5" />
                            Launch Challenge
                          </Button>
                        </form>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/60 sm:items-end">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-primary" />
                          <span className="text-foreground">{post.number_of_completions ?? 0}</span> solves
                        </span>
                        {post.content_url && (
                          <div className="flex items-center gap-1.5 rounded-full bg-muted/80 px-3 py-1 font-mono lowercase tracking-normal">
                            <Terminal className="size-3 text-primary" />
                            <span className="max-w-[120px] truncate">{post.content_url}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <section className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-sm sm:p-10">
              <CommentThread
                postId={post.id}
                flatComments={flatComments}
                currentUserId={user?.id ?? null}
                readOnly={!canDiscuss}
                title="Discussion"
                embedded
              />
            </section>
          </div>

          <aside className="w-full shrink-0 space-y-6 lg:sticky lg:top-20 lg:w-[min(100%,380px)] lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-sm">
              <ReadOnlyStarRating
                averageRating={post.average_rating}
                ratingsCount={post.ratings_count}
                countsByStar={ratingBreakdown}
                className="border-b border-border/50 pb-6"
              />
              <p className="mt-5 text-xs font-medium leading-relaxed text-muted-foreground">
                Star ratings are submitted on the completion page after you finish. Solvers can discuss in the section
                below the challenge.
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-sm">
              <h3 className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Challenge Technical Specs</h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Difficulty Level</span>
                  <span className={cn(
                    "font-bold uppercase tracking-widest text-[11px]",
                    post.difficulty === 'easy' ? 'text-emerald-500' : 
                    post.difficulty === 'hard' ? 'text-rose-500' : 'text-amber-500'
                  )}>
                    {post.difficulty || 'medium'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Stack / Language</span>
                  <span className="flex items-center gap-1.5 font-bold text-foreground">
                    <Globe className="size-3.5 text-primary/60" />
                    {post.benchmark_language || 'Any'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Release Date</span>
                  <span className="font-bold text-foreground">
                    {new Date(post.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Total Solves</span>
                  <span className="flex items-center gap-1.5 font-bold text-foreground">
                    <CheckCircle2 className="size-3.5 text-primary/60" />
                    {post.number_of_completions ?? 0}
                  </span>
                </div>
                {post.benchmark_timeout_ms && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Execution Limit</span>
                    <span className="flex items-center gap-1.5 font-bold text-foreground">
                      <ShieldCheck className="size-3.5 text-primary/60" />
                      {(post.benchmark_timeout_ms / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}
                
                {post.tags && post.tags.length > 0 && (
                  <div className="border-t border-border/50 pt-5">
                    <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Skills Required</span>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag: string, i: number) => (
                        <span key={i} className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
