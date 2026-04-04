'use client'

import { Trash2 } from 'lucide-react'
import { deletePublishedChallenge } from '@/app/profile/actions'

type Props = {
  postId: string
  title: string
}

export function DeleteChallengeButton({ postId, title }: Props) {
  return (
    <form action={deletePublishedChallenge}>
      <input type="hidden" name="postId" value={postId} />
      <button
        type="submit"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Delete challenge: ${title}`}
        title="Delete challenge"
        onClick={(e) => {
          if (!confirm(`Delete “${title}”? This cannot be undone.`)) {
            e.preventDefault()
          }
        }}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </form>
  )
}
