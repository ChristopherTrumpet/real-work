import { createClient } from '@/utils/supabase/server'

export type ChallengeWorkspacePayload = {
  post: Record<string, unknown> | null
  comments: Record<string, unknown>[] | undefined
  currentUserId: string | null
  canDiscuss: boolean
}

/** Loads post, comments, and solver discussion flag for challenge VM sessions (preview or studio). */
export async function getChallengeWorkspacePayload(postId: string): Promise<ChallengeWorkspacePayload> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: postData } = await supabase
    .from('posts')
    .select('*, profiles!user_id(username, full_name, avatar_url)')
    .eq('id', postId)
    .maybeSingle()

  let comments: Record<string, unknown>[] | undefined
  if (postData) {
    const { data: commentsData } = await supabase
      .from('post_comments')
      .select('id, user_id, parent_id, body, created_at, profiles!user_id(username, full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    comments = (commentsData as Record<string, unknown>[]) ?? undefined
  }

  let canDiscuss = false
  if (user) {
    const { data: row } = await supabase
      .from('user_completions')
      .select('user_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()
    canDiscuss = Boolean(row)
  }

  return {
    post: postData as Record<string, unknown> | null,
    comments,
    currentUserId: user?.id ?? null,
    canDiscuss,
  }
}
