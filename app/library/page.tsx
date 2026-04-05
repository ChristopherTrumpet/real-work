import { createClient } from '@/utils/supabase/server'
import LibraryClient from './LibraryClient'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-background pt-16">
      <LibraryClient initialUserId={user?.id} />
    </main>
  )
}
