'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not found')
  }

  const updates = {
    id: user.id,
    username: formData.get('username') as string,
    full_name: formData.get('full_name') as string,
    avatar_url: formData.get('avatar_url') as string,
    bio: formData.get('bio') as string,
    website: formData.get('website') as string,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('profiles').upsert(updates)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/profile')
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not found')
  }

  // Call the database function to delete the user completely
  const { error } = await supabase.rpc('delete_user')

  if (error) {
    throw new Error(error.message)
  }

  // Sign out cleanly
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function deletePublishedChallenge(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const postId = (formData.get('postId') as string | null)?.trim()
  if (!postId) {
    redirect('/profile')
  }

  const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id)

  revalidatePath('/profile')
  revalidatePath('/', 'layout')

  if (error) {
    console.error('deletePublishedChallenge:', error.message)
  }

  redirect('/profile')
}