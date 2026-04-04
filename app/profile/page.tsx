import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { updateProfile } from './actions'
import DifficultyWheel from '@/components/DifficultyWheel'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch some stats for the user
  const { count: uploadsCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  const { data: probStats } = await supabase.from('user_problem_statistics').select('*').eq('user_id', user.id).maybeSingle()
  const { data: rateStats } = await supabase.from('user_rating_statistics').select('*').eq('user_id', user.id).maybeSingle()

  return (
    <main className="flex min-h-screen flex-col items-center bg-zinc-50 dark:bg-black p-8 sm:p-12 md:p-24 text-zinc-900 dark:text-zinc-100">
      
      {/* Header section */}
      <div className="w-full max-w-3xl flex justify-between items-center mb-12">
        <h1 className="text-3xl font-extrabold tracking-tight">Your Profile</h1>
        <Link href="/" className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-white rounded-full text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
          Back to Dashboard
        </Link>
      </div>

      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Stats */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Statistics</h2>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Uploads</span>
                <span className="font-bold">{uploadsCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Challenges Solved</span>
                <span className="font-bold">{probStats?.problems_solved || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-zinc-100 dark:border-zinc-800 pt-2">
                <span className="text-green-600">Easy</span>
                <span>{probStats?.easy_solved || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-yellow-600">Medium</span>
                <span>{probStats?.medium_solved || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-red-600">Hard</span>
                <span>{probStats?.hard_solved || 0}</span>
              </div>
              <div className="flex justify-between items-center mt-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <span className="text-zinc-500">Ratings Given</span>
                <span className="font-bold">{rateStats?.ratings_given || 0}</span>
              </div>
            </div>
          </div>
          
          <form action="/auth/signout" method="post">
            <button type="submit" className="w-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 p-3 rounded-2xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-bold">
              Sign Out
            </button>
          </form>
        </div>

        {/* Right Column: Settings Form */}
        <div className="md:col-span-2 p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
          <h2 className="text-2xl font-bold mb-2">Account Settings</h2>
          <p className="mb-8 text-zinc-500">Logged in as: <strong className="text-zinc-900 dark:text-zinc-100">{user.email}</strong></p>

          <form action={updateProfile} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="username" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Username</label>
                <input 
                  id="username" 
                  name="username" 
                  type="text" 
                  defaultValue={profile?.username || ''} 
                  className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="full_name" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Full Name</label>
                <input 
                  id="full_name" 
                  name="full_name" 
                  type="text" 
                  defaultValue={profile?.full_name || ''} 
                  className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="avatar_url" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Avatar URL</label>
              <input 
                id="avatar_url" 
                name="avatar_url" 
                type="url" 
                defaultValue={profile?.avatar_url || ''} 
                className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="website" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Website</label>
              <input 
                id="website" 
                name="website" 
                type="url" 
                defaultValue={profile?.website || ''} 
                className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="bio" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Bio</label>
              <textarea 
                id="bio" 
                name="bio" 
                defaultValue={profile?.bio || ''} 
                className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
              />
            </div>
            
            <button type="submit" className="mt-4 w-full bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-500/20">
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
