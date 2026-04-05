'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitCompletion(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to submit a completion.' }
  }

  const { error } = await supabase.from('user_completions').insert({
    user_id: user.id,
    post_id: postId
  })

  if (error && error.code !== '23505') { // Ignore unique constraint violation if already completed
    return { error: error.message }
  }

  revalidatePath('/preview')
  revalidatePath('/studio')
  revalidatePath('/')
  revalidatePath(`/challenge/${postId}`)
  revalidatePath(`/challenge/${postId}/complete`)
  return { success: true }
}

export async function submitRating(postId: string, rating: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to rate.' }
  }

  // UPSERT the rating
  const { error } = await supabase.from('post_ratings').upsert({
    user_id: user.id,
    post_id: postId,
    rating
  }, { onConflict: 'user_id, post_id' })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/preview')
  revalidatePath('/studio')
  revalidatePath(`/challenge/${postId}`)
  revalidatePath(`/challenge/${postId}/complete`)
  return { success: true }
}

export async function submitComment(postId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to comment.' }
  }

  const body = formData.get('body') as string
  if (!body || body.trim().length === 0) {
    return { error: 'Comment cannot be empty.' }
  }

  const { data: solved } = await supabase
    .from('user_completions')
    .select('user_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!solved) {
    return { error: 'Complete this challenge before commenting.' }
  }

  const { error } = await supabase.from('post_comments').insert({
    user_id: user.id,
    post_id: postId,
    body: body.trim()
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/preview')
  revalidatePath('/studio')
  revalidatePath(`/challenge/${postId}`)
  revalidatePath(`/challenge/${postId}/complete`)
  return { success: true }
}
