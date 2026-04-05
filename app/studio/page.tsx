import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import StudioWorkspace from './StudioWorkspace'
import PreviewWorkspace from '@/app/preview/Workspace'
import { getChallengeWorkspacePayload } from '@/lib/challenge-workspace-data'

export default async function StudioPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const postId = typeof searchParams.postId === 'string' ? searchParams.postId : undefined
  const port = typeof searchParams.port === 'string' ? searchParams.port : undefined
  const containerId = typeof searchParams.containerId === 'string' ? searchParams.containerId : undefined

  const isChallengeSession = Boolean(postId && port && containerId)

  if (isChallengeSession && postId) {
    const ctx = await getChallengeWorkspacePayload(postId)
    if (!ctx.post) {
      notFound()
    }

    return (
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-zinc-900 font-bold text-white">
            Loading workspace…
          </div>
        }
      >
        <PreviewWorkspace
          post={ctx.post}
          comments={ctx.comments}
          currentUserId={ctx.currentUserId}
          canDiscuss={ctx.canDiscuss}
          basePath="/studio"
        />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div>Loading Studio...</div>}>
      <StudioWorkspace />
    </Suspense>
  )
}
