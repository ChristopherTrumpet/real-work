import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { deployContainer } from '@/app/actions/docker'
import { CommentThread } from '@/components/CommentThread'
import { ReadOnlyStarRating, ratingRowsToBreakdown } from '@/components/read-only-star-rating'
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
    .select('*, profiles!user_id(username, full_name)')
    .eq('id', id)
    .maybeSingle()

  if (error || !post) {
    notFound()
  }

  const { data: rawComments } = await supabase
    .from('post_comments')
    .select('id, user_id, parent_id, body, created_at, profiles!user_id(username, full_name)')
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
        profiles: profileRow as { username: string | null; full_name: string | null } | null,
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

  const author = post.profiles as { username: string | null; full_name: string | null } | null

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/" className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Back to feed
      </Link>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {post.thumbnail_url && (
              <div className="aspect-video w-full border-b border-border bg-muted">
                <img
                  src={post.thumbnail_url}
                  alt={post.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{post.title}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  by{' '}
                  {author?.username ? (
                    <Link
                      href={`/u/${encodeURIComponent(author.username)}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {author.full_name || author.username}
                    </Link>
                  ) : (
                    <span>{author?.full_name || 'Unknown'}</span>
                  )}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  post.difficulty === 'easy'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : post.difficulty === 'hard'
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                      : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                }`}
              >
                {post.difficulty || 'medium'}
              </span>
            </div>

            {post.description && <p className="mt-4 text-foreground/90 whitespace-pre-wrap">{post.description}</p>}

            {post.tags && post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {post.tags.map((tag: string, i: number) => (
                  <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>{post.number_of_completions ?? 0} solves</span>
              {post.content_url && (
                <code className="rounded bg-muted px-2 py-0.5 text-xs">{post.content_url}</code>
              )}
            </div>

            {user && (
              <div className="mt-8 flex flex-wrap gap-2">
                {hasSession ? (
                  <>
                    <form action={deployContainer}>
                      <input type="hidden" name="image" value={post.content_url ?? ''} />
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="actionType" value="resume" />
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Resume
                      </button>
                    </form>
                    <form action={deployContainer}>
                      <input type="hidden" name="image" value={post.content_url ?? ''} />
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="actionType" value="restart" />
                      <button
                        type="submit"
                        className="rounded-lg bg-destructive/90 px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive"
                      >
                        Reclone
                      </button>
                    </form>
                  </>
                ) : (
                  <form action={deployContainer}>
                    <input type="hidden" name="image" value={post.content_url ?? ''} />
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="actionType" value="launch" />
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Launch challenge
                    </button>
                  </form>
                  )}
                  </div>
                  )}
                  </div>
                  </article>
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
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

        <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-[min(100%,380px)] lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <ReadOnlyStarRating
              averageRating={post.average_rating}
              ratingsCount={post.ratings_count}
              countsByStar={ratingBreakdown}
              className="border-b border-border pb-5"
            />
            <p className="mt-4 text-xs text-muted-foreground">
              Star ratings are submitted on the completion page after you finish. Solvers can discuss in the section
              below the challenge.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Challenge Info</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Difficulty</span>
                <span className={`font-semibold capitalize ${
                  post.difficulty === 'easy' ? 'text-emerald-500' : 
                  post.difficulty === 'hard' ? 'text-rose-500' : 'text-amber-500'
                }`}>
                  {post.difficulty || 'medium'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Language</span>
                <span className="font-medium text-foreground capitalize">{post.benchmark_language || 'Any'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Added</span>
                <span className="font-medium text-foreground">
                  {new Date(post.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Solves</span>
                <span className="font-medium text-foreground">{post.number_of_completions ?? 0}</span>
              </div>
              {post.benchmark_timeout_ms && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Timeout</span>
                  <span className="font-medium text-foreground">{(post.benchmark_timeout_ms / 1000).toFixed(1)}s</span>
                </div>
              )}
              
              {post.tags && post.tags.length > 0 && (
                <div className="border-t border-border pt-4">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map((tag: string, i: number) => (
                      <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/80">
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
  )
}
