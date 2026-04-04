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
  const [refreshKey, setRefreshKey] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { setPort(initialPort); }, [initialPort])

  useEffect(() => {
    if (!port) return
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const checkReady = async () => {
      try {
        const ready = await isContainerReady(parseInt(port))
        if (ready && isMounted) {
          // Small delay to let the inner webserver settle
          setTimeout(() => {
             if (isMounted) {
               setIsReady(true)
               setRefreshKey(prev => prev + 1)
             }
          }, 1000)
        } else if (isMounted) {
          timeoutId = setTimeout(checkReady, 1000)
        }
      } catch (e) {
        if (isMounted) timeoutId = setTimeout(checkReady, 1000)
      }
    }
    checkReady()
    return () => { isMounted = false; if (timeoutId) clearTimeout(timeoutId); }
  }, [port])

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
    alert('Challenge completed!');
    setIsSubmitting(false);
  }

  return (
    <div className="flex flex-col w-full h-screen bg-zinc-900 text-white overflow-hidden">
      <nav className="h-16 px-6 bg-zinc-950 flex justify-between items-center border-b border-zinc-800">
        <h1 className="font-bold">Preview Mode: {post?.title}</h1>
        <button onClick={handleBackToDashboard} disabled={isLeaving} className="bg-zinc-800 px-4 py-2 rounded text-sm">
          {isLeaving ? 'Saving...' : 'Save & Return'}
        </button>
      </nav>
      
      <div className="flex flex-grow h-[calc(100vh-4rem)]">
        {post && (
          <div className="w-[400px] border-r border-zinc-800 p-6 flex flex-col overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{post.title}</h2>
            <p className="text-sm text-zinc-400 mb-6">{post.description}</p>
            <button onClick={handleComplete} disabled={!isReady || isSubmitting} className="bg-green-600 p-3 rounded font-bold">
              Submit Solution
            </button>
          </div>
        )}

        <div className="flex-grow relative bg-black">
          {port && (
            !isReady ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                   <p>Launching Local Session...</p>
               </div>
            ) : (
              <iframe 
                key={refreshKey}
                src={`http://localhost:${port}`} 
                className="w-full h-full border-none" 
              />
            )
          )}
        </div>
      </div>
    </div>
  )
}
