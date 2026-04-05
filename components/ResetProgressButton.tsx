'use client'

import { useState } from 'react'
import { resetProgress } from '@/app/actions/docker'

export function ResetProgressButton({ 
  postId, 
  userId, 
  className,
  title = "Reset progress?"
}: { 
  postId: string, 
  userId: string, 
  className?: string,
  title?: string
}) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    setIsResetting(true)
    try {
      await resetProgress(postId, userId)
    } catch (e) {
      console.error(e)
      alert('Failed to reset progress')
    } finally {
      setIsResetting(false)
      setIsConfirming(false)
    }
  }

  if (isConfirming) {
    return (
      <div className="flex flex-col gap-2 min-w-[7.5rem]">
        <p className="text-[10px] text-muted-foreground text-center font-medium">Are you sure?</p>
        <div className="flex gap-1">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex-1 cursor-pointer rounded-lg bg-destructive px-2 py-1.5 text-[10px] font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {isResetting ? '...' : 'Yes'}
          </button>
          <button
            onClick={() => setIsConfirming(false)}
            disabled={isResetting}
            className="flex-1 cursor-pointer rounded-lg border border-border bg-transparent px-2 py-1.5 text-[10px] font-bold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            No
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsConfirming(true)}
      className={className}
      title="Delete currently saved progress image"
    >
      Reset
    </button>
  )
}
