'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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