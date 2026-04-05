'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addComment } from '@/app/challenge/actions'
import { submitRating } from '@/app/actions/preview'
import { cn } from '@/lib/utils'

export function CompletionFeedbackForm({
  postId,
  initialRating,
}: {
  postId: string
  initialRating: number | null
}) {
  const router = useRouter()
  const [stars, setStars] = useState<number>(initialRating ?? 0)
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = body.trim()
    if (stars < 1 && !trimmed) {
      setError('Choose a star rating and/or write a comment.')
      return
    }
    setPending(true)
    try {
      if (stars >= 1) {
        const r = await submitRating(postId, stars)
        if ('error' in r && r.error) {
          setError(r.error)
          setPending(false)
          return
        }
      }
      if (trimmed) {
        const fd = new FormData()
        fd.set('body', trimmed)
        fd.set('postId', postId)
        const c = await addComment(fd)
        if (!c.ok) {
          setError(c.error)
          setPending(false)
          return
        }
      }
      setDone(true)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Rate & discuss</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your rating and comment are shared with the community. You can update your star rating anytime.
        </p>
      </div>

      <div>
        <span className="text-sm font-medium text-foreground">Your rating</span>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              className={cn(
                'flex size-10 items-center justify-center rounded-lg transition-colors',
                stars >= n
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
            >
              <svg className="size-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="completion-comment" className="text-sm font-medium text-foreground">
          Comment
        </label>
        <textarea
          id="completion-comment"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="What did you think of this challenge?"
          className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {done && <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved. Thanks for the feedback.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Submit feedback'}
      </button>
    </form>
  )
}
