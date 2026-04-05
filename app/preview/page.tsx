import { Suspense } from 'react'
import PreviewWorkspace from './Workspace'
import { createClient } from '@/utils/supabase/server'

export default async function PreviewPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const postId = searchParams.postId as string | undefined
  let post = null
  let comments = null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (postId) {
    const { data: postData } = await supabase
      .from('posts')
      .select('*, profiles!user_id(username, full_name, avatar_url)')
      .eq('id', postId)
      .single()

    post = postData

    if (postData) {
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('id, user_id, parent_id, body, created_at, profiles!user_id(username, full_name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      comments = commentsData
    }
  }

  let canDiscuss = false
  if (user && postId) {
    const { data: row } = await supabase
      .from('user_completions')
      .select('user_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()
    canDiscuss = Boolean(row)
  }

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-zinc-900 font-bold text-white">Loading Workspace...</div>}>
      <PreviewWorkspace
        post={post}
        comments={comments ?? undefined}
        currentUserId={user?.id ?? null}
        canDiscuss={canDiscuss}
      />
    </Suspense>
  )
}
