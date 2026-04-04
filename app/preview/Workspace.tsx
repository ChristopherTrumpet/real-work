'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DraggableWindow from '@/components/DraggableWindow'
import { killContainer, isContainerReady } from '@/app/actions/docker'
import { submitCompletion, submitRating, submitComment } from '@/app/actions/preview'

export default function PreviewWorkspace({ post, comments }: { post?: any, comments?: any[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPort = searchParams.get('port')
  
  const [port, setPort] = useState<string | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isReady, setIsReady] = useState(false)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rating, setRating] = useState<number>(0)

  useEffect(() => {
    setPort(initialPort)
  }, [initialPort])

  useEffect(() => {
    if (!port) return
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const checkReady = async () => {
      try {
        const ready = await isContainerReady(parseInt(port))
        if (ready && isMounted) {
          timeoutId = setTimeout(() => {
            if (isMounted) setIsReady(true)
          }, 2000)
        } else if (isMounted) {
          timeoutId = setTimeout(checkReady, 2000)
        }
      } catch (e) {
        if (isMounted) timeoutId = setTimeout(checkReady, 2000)
      }
    }
    checkReady()
    return () => { 
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [port])

  const handleClose = () => {
    setPort(null)
    window.history.replaceState(null, '', '/preview')
  }

  const handleBackToDashboard = async () => {
    if (port) {
      setIsLeaving(true)
      await killContainer(parseInt(port))
    }
    router.push('/')
  }

  const handleComplete = async () => {
    if (!post) return;
    setIsSubmitting(true);
    await submitCompletion(post.id);
    alert('Congratulations! Challenge completed and saved.');
    setIsSubmitting(false);
  }

  const handleRate = async (star: number) => {
    if (!post) return;
    setRating(star);
    await submitRating(post.id, star);
  }

  return (
    <div className="flex flex-col w-full h-screen bg-zinc-100 dark:bg-zinc-900 overflow-hidden text-zinc-900 dark:text-zinc-100">
      <nav className="h-16 shrink-0 px-6 bg-gray-900/95 backdrop-blur-sm text-white flex justify-between items-center border-b border-gray-800 z-50">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg tracking-tight">Active Workspace</h1>
          {post && (
             <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full border border-zinc-700">
               {post.title}
             </span>
          )}
        </div>
        <button 
          onClick={handleBackToDashboard} 
          disabled={isLeaving}
          className="text-sm bg-gray-700 px-4 py-2 rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          {isLeaving ? 'Saving Session...' : 'Save & Return to Dashboard'}
        </button>
      </nav>
      
      <div className="flex flex-grow w-full h-[calc(100vh-4rem)] overflow-hidden">
        
        {/* Optional Left Panel for Post Details */}
        {post && (
          <div className="w-[400px] shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-6 flex flex-col overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{post.title}</h2>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  post.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  post.difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {post.difficulty || 'medium'}
                </span>
                <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                   By {post.profiles?.username || 'Unknown'}
                </span>
              </div>
              
              <div className="prose dark:prose-invert text-sm text-zinc-600 dark:text-zinc-400 mb-6 whitespace-pre-wrap">
                {post.description}
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold mb-3 text-sm">Challenge Controls</h3>
                <button 
                  onClick={handleComplete}
                  disabled={isSubmitting || !isReady}
                  className="w-full bg-green-600 text-white p-3 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 mb-4"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Solution!'}
                </button>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase">Rate this Challenge</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star}
                        onClick={() => handleRate(star)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          rating >= star ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' : 'text-zinc-300 hover:text-yellow-400 dark:text-zinc-700'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <h3 className="font-bold text-lg mb-4">Comments</h3>
              
              <form action={submitComment.bind(null, post.id)} className="flex flex-col gap-2 mb-6">
                <textarea 
                  name="body" 
                  placeholder="Leave a comment..." 
                  required 
                  className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm"
                  rows={3}
                />
                <button type="submit" className="self-end px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                  Post Comment
                </button>
              </form>

              <div className="flex flex-col gap-4">
                {comments && comments.length > 0 ? (
                  comments.map(comment => (
                    <div key={comment.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{comment.profiles?.username || 'Anonymous'}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500 italic text-center py-4">No comments yet. Be the first!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Right Panel: Iframe Workspace */}
        <div className="flex-grow relative bg-zinc-200 dark:bg-black">
          {!post && port && (
             <DraggableWindow port={port} onClose={handleClose} />
          )}

          {post && (
            !isReady ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                   <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
                   <h3 className="text-xl font-bold mb-2 text-zinc-800 dark:text-zinc-200">Booting Environment...</h3>
                   <p className="text-sm italic">This may take a moment.</p>
               </div>
            ) : (
              <iframe 
                src={`http://localhost:${port}`} 
                className="w-full h-full border-none"
                title="Active Workspace"
              />
            )
          )}
          
          {!port && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <h2 className="text-2xl font-bold">Workspace Empty</h2>
                <p className="mt-2">Deploy a new container from the dashboard to begin.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


