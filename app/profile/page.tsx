import { redirect } from 'next/navigation'
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

  // Fetch some stats for the user (Uploads, Likes, Completions)
  // We use `count: 'exact', head: true` to get the count without fetching all the rows
  const { count: uploadsCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  const { count: likesCount } = await supabase.from('user_likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  const { count: completionsCount } = await supabase.from('user_completions').select('*', { count: 'exact', head: true }).eq('user_id', user.id)

  const { data: problemStats } = await supabase
    .from('user_problem_statistics')
    .select('easy_solved, medium_solved, hard_solved')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: ratingStats } = await supabase
    .from('user_rating_statistics')
    .select('ratings_given, average_stars_given')
    .eq('user_id', user.id)
    .maybeSingle()

  const easySolved = Number(problemStats?.easy_solved ?? 0)
  const mediumSolved = Number(problemStats?.medium_solved ?? 0)
  const hardSolved = Number(problemStats?.hard_solved ?? 0)
  const ratingsGiven = Number(ratingStats?.ratings_given ?? 0)
  const avgStarsGiven = ratingStats?.average_stars_given

  return (
    <div className="flex flex-col items-center min-h-screen py-10 px-4">
      <div className="w-full max-w-2xl p-8 border rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
        <p className="mb-6 text-gray-500">Logged in as: <strong>{user.email}</strong></p>

        {/* User Stats Display */}
        <div className="flex gap-4 mb-8 p-4 bg-gray-100 dark:bg-zinc-800 rounded-lg text-center justify-between">
            <div className="flex flex-col">
                <span className="text-2xl font-bold text-black dark:text-white">{uploadsCount || 0}</span>
                <span className="text-sm text-gray-500 dark:text-zinc-400">Uploads</span>
            </div>
            <div className="flex flex-col">
                <span className="text-2xl font-bold text-black dark:text-white">{likesCount || 0}</span>
                <span className="text-sm text-gray-500 dark:text-zinc-400">Likes</span>
            </div>
            <div className="flex flex-col">
                <span className="text-2xl font-bold text-black dark:text-white">{completionsCount || 0}</span>
                <span className="text-sm text-gray-500 dark:text-zinc-400">Completed</span>
            </div>
        </div>

        <section className="mb-10 p-5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Solved by difficulty
          </h2>
          <DifficultyWheel easy={easySolved} medium={mediumSolved} hard={hardSolved} />
        </section>

        <section className="mb-10 p-5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Your ratings
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            Challenges you have rated (1–5 stars). Community averages for each challenge appear on the feed.
          </p>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Rated</span>
              <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{ratingsGiven}</p>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Avg stars you give</span>
              <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                {avgStarsGiven != null ? Number(avgStarsGiven).toFixed(2) : '—'}
              </p>
            </div>
          </div>
        </section>
        
        <form action={updateProfile} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="username">Username</label>
            <input 
              id="username" 
              name="username" 
              type="text" 
              defaultValue={profile?.username || ''} 
              className="border p-2 rounded text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="full_name">Full Name</label>
            <input 
              id="full_name" 
              name="full_name" 
              type="text" 
              defaultValue={profile?.full_name || ''} 
              className="border p-2 rounded text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="avatar_url">Avatar URL</label>
            <input 
              id="avatar_url" 
              name="avatar_url" 
              type="url" 
              defaultValue={profile?.avatar_url || ''} 
              className="border p-2 rounded text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="bio">Bio</label>
            <textarea 
              id="bio" 
              name="bio" 
              defaultValue={profile?.bio || ''} 
              className="border p-2 rounded text-black h-24"
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label htmlFor="website">Website</label>
            <input 
              id="website" 
              name="website" 
              type="url" 
              defaultValue={profile?.website || ''} 
              className="border p-2 rounded text-black"
            />
          </div>

          <button type="submit" className="mt-4 bg-green-500 text-white p-2 rounded hover:bg-green-600 font-bold">
            Save Profile Changes
          </button>
        </form>
        
        <form action="/auth/signout" method="post" className="mt-8">
          <button type="submit" className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600 font-bold">
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}