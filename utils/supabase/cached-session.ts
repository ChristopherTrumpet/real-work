import { cache } from 'react'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/utils/supabase/server'

/**
 * One Supabase client + getUser() per request for all Server Components.
 * Avoids duplicate auth round-trips from layout (header) + page in the same render.
 */
export const getServerSupabaseUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user: user as User | null }
})
