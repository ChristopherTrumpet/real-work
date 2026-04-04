import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { deployContainer } from '@/app/actions/docker'
import { CommentThread } from '@/components/CommentThread'
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

  const author = post.profiles as { username: string | null; full_name: string | null } | null

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block">
        ← Back to feed
      </Link>

      <article className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{post.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              by{' '}
              {author?.username ? (
                <Link href={`/u/${encodeURIComponent(author.username)}`} className="text-primary font-medium hover:underline">
                  {author.full_name || author.username}
                </Link>
              ) : (
                <span>{author?.full_name || 'Unknown'}</span>
              )}
            </p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1 ${
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
          <span>★ {post.average_rating != null ? Number(post.average_rating).toFixed(1) : '—'} ratings</span>
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
      </article>

      <CommentThread postId={post.id} flatComments={flatComments} currentUserId={user?.id ?? null} />
    </main>
  )
}
