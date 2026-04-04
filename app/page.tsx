import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { deployContainer } from './actions/docker'
import { startStudioSession } from './actions/studio'
import fs from 'fs'
import path from 'path'

export default async function Home() {
  const supabase = await createClient()
  
  // Fetch user session
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch containers (posts) from Supabase
  const { data: containers, error: fetchError } = await supabase
    .from('posts')
    .select('*, profiles!user_id(username, full_name)')
    .order('created_at', { ascending: false })

  // Check which containers have active local sessions
  const activeSessions = new Set<string>()
  if (user && containers) {
    containers.forEach(container => {
      const localPath = path.join(process.cwd(), 'container_data', user.id, container.id)
      if (fs.existsSync(localPath)) {
        activeSessions.add(container.id)
      }
    })
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-zinc-50 dark:bg-black p-8 sm:p-12 md:p-24">
      {/* Header section */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-extrabold tracking-tight">DockerHub Lite</h1>
          {user && (
            <form action={startStudioSession}>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-bold hover:bg-green-700 transition-colors shadow-sm">
                + Create Challenge
              </button>
            </form>
          )}
        </div>
        <div className="flex gap-4 items-center">
          {user ? (
            <>
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">Hi, {user.email}</span>
              <Link href="/profile" className="px-4 py-2 bg-zinc-800 text-white rounded-full text-sm font-medium hover:bg-zinc-700 transition-colors">
                Profile
              </Link>
            </>
          ) : (
            <Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-500 transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </div>


      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar / Deployment Form */}
        <div className="md:col-span-1">
          <div className="sticky top-8 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Deploy Image</h2>
            <form action={deployContainer} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="image" className="text-sm font-medium text-zinc-500">Docker Image Name</label>
                <input 
                  id="image" 
                  name="image" 
                  type="text" 
                  placeholder="e.g. challenge01" 
                  required 
                  className="w-full border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl text-black dark:text-white bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                />
              </div>
              <p className="text-[10px] text-zinc-400 italic">Targeting internal port 3000</p>
              <button type="submit" className="w-full bg-zinc-900 dark:bg-white dark:text-black text-white p-3 rounded-xl hover:opacity-90 transition-opacity font-bold">
                Launch Now
              </button>
            </form>

            <Link href="/preview" className="mt-4 block text-center text-sm text-blue-600 hover:underline">
              View Active Session →
            </Link>
          </div>
        </div>

        {/* Feed section */}
        <div className="md:col-span-2">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            Available Containers
            <span className="bg-zinc-200 dark:bg-zinc-800 text-xs px-2 py-0.5 rounded-full">{containers?.length || 0}</span>
          </h2>

          {fetchError && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6">
              Failed to load containers: {fetchError.message}
            </div>
          )}

          <div className="flex flex-col gap-6">
            {containers && containers.length > 0 ? (
              containers.map((container) => {
                const hasSession = activeSessions.has(container.id)
                return (
                  <div key={container.id} className="group p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-zinc-400 dark:hover:border-zinc-500 transition-all shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold group-hover:text-blue-600 transition-colors">{container.title}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            container.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            container.difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {container.difficulty || 'medium'}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500 line-clamp-2">{container.description}</p>
                        
                        {container.tags && container.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {container.tags.map((tag: string, i: number) => (
                              <span key={i} className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500 font-medium">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            {container.average_rating ? Number(container.average_rating).toFixed(1) : 'New'} ({container.ratings_count || 0})
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {container.number_of_completions || 0} solves
                          </span>
                        </div>
                      </div>

                      
                      {/* Container Actions */}
                      <div className="flex gap-2 w-full sm:w-auto">
                        {hasSession ? (
                          <>
                            <form action={deployContainer} className="flex-1 sm:flex-none">
                              <input type="hidden" name="image" value={container.content_url} />
                              <input type="hidden" name="postId" value={container.id} />
                              {user && <input type="hidden" name="userId" value={user.id} />}
                              <input type="hidden" name="actionType" value="resume" />
                              <button type="submit" className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20">
                                Resume
                              </button>
                            </form>
                            <form action={deployContainer} className="flex-1 sm:flex-none">
                              <input type="hidden" name="image" value={container.content_url} />
                              <input type="hidden" name="postId" value={container.id} />
                              {user && <input type="hidden" name="userId" value={user.id} />}
                              <input type="hidden" name="actionType" value="restart" />
                              <button type="submit" className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20" title="Start Over">
                                Reclone
                              </button>
                            </form>
                          </>
                        ) : (
                          <form action={deployContainer} className="flex-1 sm:flex-none">
                            <input type="hidden" name="image" value={container.content_url} />
                            <input type="hidden" name="postId" value={container.id} />
                            {user && <input type="hidden" name="userId" value={user.id} />}
                            <input type="hidden" name="actionType" value="launch" />
                            <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                              Launch
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold">
                          {(container.profiles?.username?.[0] || 'U').toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          {container.profiles?.full_name || container.profiles?.username || 'Anonymous'}
                        </span>
                      </div>
                      <code className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-500">
                        image: {container.content_url}
                      </code>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <p className="text-zinc-400">No containers available in the feed yet.</p>
                <p className="text-xs text-zinc-500 mt-2">Add posts to the 'posts' table in Supabase to see them here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
