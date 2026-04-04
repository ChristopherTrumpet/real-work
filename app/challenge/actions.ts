'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function addComment(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false as const, error: 'Sign in to comment.' }
  }

  const postId = formData.get('postId') as string
  const body = String(formData.get('body') ?? '').trim()
  const parentRaw = formData.get('parentId') as string | null
  const parentId = parentRaw && parentRaw.length > 0 ? parentRaw : null

  if (!postId || !body) {
    return { ok: false as const, error: 'Comment cannot be empty.' }
  }

  const { error } = await supabase.from('post_comments').insert({
    post_id: postId,
    user_id: user.id,
    body,
    parent_id: parentId,
  })

  if (error) {
    return { ok: false as const, error: error.message }
  }

  revalidatePath(`/challenge/${postId}`)
  return { ok: true as const }
}
