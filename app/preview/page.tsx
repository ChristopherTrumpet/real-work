import { Suspense } from 'react'
import PreviewWorkspace from './Workspace'
import { getChallengeWorkspacePayload } from '@/lib/challenge-workspace-data'

export default async function PreviewPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const postId = searchParams.postId as string | undefined

  let post: Record<string, unknown> | null = null
  let comments: Record<string, unknown>[] | undefined
  let currentUserId: string | null = null
  let canDiscuss = false

  if (postId) {
    const ctx = await getChallengeWorkspacePayload(postId)
    post = ctx.post
    comments = ctx.comments
    currentUserId = ctx.currentUserId
    canDiscuss = ctx.canDiscuss
  }

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-zinc-900 font-bold text-white">Loading Workspace...</div>}>
      <PreviewWorkspace
        post={post}
        comments={comments}
        currentUserId={currentUserId}
        canDiscuss={canDiscuss}
        basePath="/preview"
      />
    </Suspense>
  )
}
