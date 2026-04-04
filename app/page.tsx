import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { deployContainer } from './actions/docker'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Welcome to your App</h1>
      
      <div className="flex gap-4 mb-12">
        {user ? (
          <Link href="/profile" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Go to Profile
          </Link>
        ) : (
          <Link href="/login" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Log In / Sign Up
          </Link>
        )}
        <Link href="/preview" className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-bold">
          View Live Preview
        </Link>
      </div>

      <div className="w-full max-w-md p-6 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Deploy New Container</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Downloads and runs a Docker image on a random available port.</p>
        <form action={deployContainer} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="image" className="text-sm font-medium">Docker Image:</label>
            <input id="image" name="image" type="text" placeholder="e.g., traefik/whoami or nginx" required className="border border-gray-300 p-2 rounded text-black" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="internalPort" className="text-sm font-medium">Container's Internal Port:</label>
            <input id="internalPort" name="internalPort" type="number" defaultValue="80" required className="border border-gray-300 p-2 rounded text-black" />
          </div>
          <button type="submit" className="mt-2 w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium">
            Deploy & Preview
          </button>
        </form>
      </div>
    </main>
  )
}
