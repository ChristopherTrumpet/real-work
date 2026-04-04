'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { publishChallenge } from '@/app/actions/studio'
import { killContainer, isContainerReady } from '@/app/actions/docker'

export default function StudioWorkspace() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const port = searchParams.get('port')
  const containerId = searchParams.get('containerId')

  const [isLeaving, setIsLeaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isReady, setIsReady] = useState(false)

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

  const handleCancel = async () => {
    if (port) {
      setIsLeaving(true)
      await killContainer(parseInt(port))
    }
    router.push('/')
  }

  const handlePublish = async (formData: FormData) => {
    setIsPublishing(true)
    try {
      await publishChallenge(formData)
    } catch (e) {
      setIsPublishing(false)
    }
  }

  if (!port || !containerId) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Studio Not Found</h2>
          <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors">
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-screen bg-zinc-100 dark:bg-zinc-900 overflow-hidden text-black dark:text-white">
      {/* Top Nav */}
      <nav className="h-16 shrink-0 px-6 bg-gray-900/95 backdrop-blur-sm text-white flex justify-between items-center border-b border-gray-800 z-50">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg tracking-tight">Studio Mode</h1>
          <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full border border-blue-500/30">
            {containerId.substring(0,12)}
          </span>
        </div>
        <button 
          onClick={handleCancel} 
          disabled={isLeaving || isPublishing}
          className="text-sm bg-red-600/20 text-red-400 px-4 py-2 rounded-full hover:bg-red-600/30 hover:text-red-300 transition-colors border border-red-600/30 disabled:opacity-50"
        >
          {isLeaving ? 'Discarding...' : 'Cancel & Discard'}
        </button>
      </nav>
      
      <div className="flex flex-grow w-full h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left Panel: Form */}
        <div className="w-[400px] shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-6 flex flex-col overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Configure Challenge</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Customize your challenge environment on the right, then fill out the details below to publish it to the feed.
            </p>
          </div>

          <form action={handlePublish} className="flex flex-col gap-6 flex-grow">
            <input type="hidden" name="containerId" value={containerId} />
            
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Challenge Title</label>
              <input 
                id="title" 
                name="title" 
                type="text" 
                placeholder="e.g. Hack The Mainframe" 
                required 
                disabled={isPublishing || isLeaving}
                className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="difficulty" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Difficulty</label>
              <select 
                id="difficulty" 
                name="difficulty" 
                required
                disabled={isPublishing || isLeaving}
                className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="insane">Insane</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 flex-grow">
              <label htmlFor="description" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Description / Instructions</label>
              <textarea 
                id="description" 
                name="description" 
                placeholder="Describe the challenge goals and any hints..." 
                required 
                disabled={isPublishing || isLeaving}
                className="w-full flex-grow border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" 
              />
            </div>

            <div className="mt-auto pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <button 
                type="submit" 
                disabled={isPublishing || isLeaving || !isReady}
                className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPublishing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : 'Publish Challenge'}
              </button>
              <p className="text-center text-xs text-zinc-500 mt-3">
                This will save the container image and post it to the feed.
              </p>
            </div>
          </form>
        </div>

        {/* Right Panel: Iframe Workspace */}
        <div className="flex-grow relative bg-zinc-200 dark:bg-black">
          {!isReady ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                 <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
                 <h3 className="text-xl font-bold mb-2 text-zinc-800 dark:text-zinc-200">Booting Studio Environment...</h3>
                 <p className="text-sm italic">This may take a moment.</p>
             </div>
          ) : (
            <iframe 
              src={`http://localhost:${port}`} 
              className="w-full h-full border-none"
              title="Studio Workspace"
            />
          )}
        </div>
      </div>
    </div>
  )
}
