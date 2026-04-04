'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addComment } from '@/app/challenge/actions'

export type CommentAuthor = {
  username: string | null
  full_name: string | null
}

export type CommentNode = {
  id: string
  user_id: string
  parent_id: string | null
  body: string
  created_at: string
  profiles: CommentAuthor | null
  replies: CommentNode[]
}

function buildTree(
  flat: Array<{
    id: string
    user_id: string
    parent_id: string | null
    body: string
    created_at: string
    profiles: CommentAuthor | null
  }>
): CommentNode[] {
  const map = new Map<string, CommentNode>()
  for (const row of flat) {
    map.set(row.id, { ...row, replies: [] })
  }
  const roots: CommentNode[] = []
  for (const row of flat) {
    const node = map.get(row.id)!
    if (row.parent_id && map.has(row.parent_id)) {
      map.get(row.parent_id)!.replies.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortReplies = (nodes: CommentNode[]) => {
    nodes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    for (const n of nodes) sortReplies(n.replies)
  }
  sortReplies(roots)
  return roots
}

function CommentCard({
  node,
  postId,
  currentUserId,
  depth,
}: {
  node: CommentNode
  postId: string
  currentUserId: string | null
  depth: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const display = node.profiles?.full_name || node.profiles?.username || 'User'

  async function onReply(formData: FormData) {
    setError(null)
    setPending(true)
    formData.set('postId', postId)
    formData.set('parentId', node.id)
    const res = await addComment(formData)
    setPending(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <div className={depth > 0 ? 'ml-4 sm:ml-8 pl-3 sm:pl-4 border-l border-border' : ''}>
      <article className="rounded-lg border border-border bg-card/50 py-3 px-3 sm:px-4">
        <header className="flex flex-wrap items-baseline gap-2 text-sm">
          <span className="font-semibold text-foreground">{display}</span>
          <time className="text-xs text-muted-foreground" dateTime={node.created_at}>
            {new Date(node.created_at).toLocaleString()}
          </time>
        </header>
        <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{node.body}</p>
        {currentUserId && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-2 text-xs font-medium text-primary hover:underline"
          >
            {open ? 'Cancel' : 'Reply'}
          </button>
        )}
        {open && currentUserId && (
          <form action={onReply} className="mt-3 space-y-2">
            <textarea
              name="body"
              required
              rows={3}
              placeholder="Write a reply…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none resize-y min-h-[72px]"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {pending ? 'Posting…' : 'Post reply'}
            </button>
          </form>
        )}
      </article>
      {node.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {node.replies.map((r) => (
            <CommentCard key={r.id} node={r} postId={postId} currentUserId={currentUserId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function CommentThread({
  postId,
  flatComments,
  currentUserId,
}: {
  postId: string
  flatComments: Array<{
    id: string
    user_id: string
    parent_id: string | null
    body: string
    created_at: string
    profiles: CommentAuthor | null
  }>
  currentUserId: string | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tree = buildTree(flatComments)

  async function onTopLevel(formData: FormData) {
    setError(null)
    setPending(true)
    formData.set('postId', postId)
    const res = await addComment(formData)
    setPending(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    router.refresh()
  }

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="text-lg font-semibold text-foreground mb-4">Comments</h2>

      {currentUserId ? (
        <form action={onTopLevel} className="mb-8 space-y-2">
          <textarea
            name="body"
            required
            rows={4}
            placeholder="Add a comment…"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none resize-y min-h-[100px]"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      ) : (
        <p className="mb-8 text-sm text-muted-foreground">
          <a href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </a>{' '}
          to join the discussion.
        </p>
      )}

      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-4">
          {tree.map((n) => (
            <CommentCard key={n.id} node={n} postId={postId} currentUserId={currentUserId} depth={0} />
          ))}
        </div>
      )}
    </section>
  )
}
