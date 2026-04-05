'use client'

import React, { useState } from 'react'
import { deployContainer } from '@/app/actions/docker'
import { ResetProgressButton } from '@/components/ResetProgressButton'

export function ChallengeActionButtons({ 
  hasSession, 
  post, 
  user 
}: { 
  hasSession: boolean, 
  post: any, 
  user: any 
}) {
  const [isDeploying, setIsDeploying] = useState(false)

  return (
    <>
      {isDeploying && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-6 shadow-lg shadow-primary/20" />
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Preparing Workspace...</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm text-center">
            {hasSession ? 'Resuming your saved session...' : 'Allocating resources and booting your isolated container environment...'}
          </p>
        </div>
      )}

      {hasSession ? (
        <>
          <form action={deployContainer} onSubmit={() => setIsDeploying(true)} className="min-w-[8rem]">
            <input type="hidden" name="image" value={post.content_url ?? ''} />
            <input type="hidden" name="postId" value={post.id} />
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="actionType" value="resume" />
            <button
              type="submit"
              className="w-full cursor-pointer rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Resume Workspace
            </button>
          </form>
          <ResetProgressButton 
            postId={post.id} 
            userId={user.id} 
            className="w-full cursor-pointer rounded-lg border border-border bg-transparent px-6 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
          />
        </>
      ) : (
        <form action={deployContainer} onSubmit={() => setIsDeploying(true)} className="min-w-[10rem]">
          <input type="hidden" name="image" value={post.content_url ?? ''} />
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="actionType" value="launch" />
          <button
            type="submit"
            className="w-full cursor-pointer rounded-lg bg-primary px-8 py-3 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
          >
            Launch Challenge
          </button>
        </form>
      )}
    </>
  )
}
