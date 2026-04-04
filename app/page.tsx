import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Welcome to your App</h1>
      
      <div className="flex gap-4">
        {user ? (
          <Link href="/profile" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Go to Profile
          </Link>
        ) : (
          <Link href="/login" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Log In / Sign Up
          </Link>
        )}
      </div>
    </main>
  )
}