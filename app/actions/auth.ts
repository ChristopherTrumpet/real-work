'use server'

import { createClient } from '@/utils/supabase/server'

export async function signInWithGitHub() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      scopes: 'repo read:user'
    }
  })

  if (error) throw error
  return data.url
}
