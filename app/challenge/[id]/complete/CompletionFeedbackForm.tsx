'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addComment } from '@/app/challenge/actions'
import { submitRating } from '@/app/actions/preview'
import { cn } from '@/lib/utils'
import { Star, MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CompletionFeedbackForm({
  postId,
  initialRating,
}: {
  postId: string
  initialRating: number | null
}) {
  const router = useRouter()
  const [stars, setStars] = useState<number>(initialRating ?? 0)
  const [hoverStars, setHoverStars] = useState<number>(0)
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
    <form onSubmit={onSubmit} className="space-y-8 rounded-3xl border border-border bg-card p-8 shadow-sm">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <MessageSquare className="size-5 text-primary" />
          Rate & Discuss
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your insights help the community. Share your technical perspective on this lab.
        </p>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Your Rating</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverStars(n)}
              onMouseLeave={() => setHoverStars(0)}
              onClick={() => setStars(n)}
              className={cn(
                'group relative flex size-12 items-center justify-center rounded-xl border transition-all duration-300',
                (hoverStars || stars) >= n
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-500 shadow-[0_0_1rem_-0.25rem_rgba(245,158,11,0.3)]'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-border-hover'
              )}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
            >
              <Star 
                className={cn(
                  "size-6 transition-transform duration-300 group-hover:scale-110",
                  (hoverStars || stars) >= n ? "fill-amber-500" : "fill-transparent"
                )} 
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <label htmlFor="completion-comment" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          Technical Review
        </label>
        <textarea
          id="completion-comment"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="What did you think of the challenge architecture, tooling, and difficulty?"
          className="w-full rounded-2xl border border-input bg-muted/10 p-5 text-sm text-foreground font-medium placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all resize-none leading-relaxed"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-500 animate-in fade-in zoom-in-95">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}
      
      {done && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-500 animate-in fade-in zoom-in-95">
          <CheckCircle2 className="size-4 shrink-0" />
          Review captured successfully. Thanks for contributing.
        </div>
      )}

      <Button
        type="submit"
        disabled={pending || done}
        size="lg"
        className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] gap-2"
      >
        {pending ? (
          <>
            <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            Transmitting...
          </>
        ) : (
          <>
            <Send className="size-4" />
            Submit Feedback
          </>
        )}
      </Button>
    </form>
  )
}
