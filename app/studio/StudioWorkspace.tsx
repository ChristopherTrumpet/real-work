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
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!port) return
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const checkReady = async () => {
      try {
        const ready = await isContainerReady(parseInt(port))
        if (ready && isMounted) {
          // Small delay to ensure the service inside is actually listening
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
      <div className="flex h-screen items-center justify-center bg-zinc-900 text-white">
        <Link href="/" className="px-4 py-2 bg-blue-600 rounded">Return Home</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-screen bg-zinc-900 text-white overflow-hidden">
      <nav className="h-16 px-6 bg-zinc-950 flex justify-between items-center border-b border-zinc-800">
        <h1 className="font-bold">Studio Mode</h1>
        <button onClick={handleCancel} disabled={isLeaving || isPublishing} className="bg-red-600 px-4 py-2 rounded text-sm">
          {isLeaving ? 'Discarding...' : 'Cancel'}
        </button>
      </nav>
      
      <div className="flex flex-grow h-[calc(100vh-4rem)]">
        <div className="w-[400px] border-r border-zinc-800 p-6 flex flex-col overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Configure Challenge</h2>
          <form action={handlePublish} className="flex flex-col gap-4">
            <input type="hidden" name="containerId" value={containerId} />
            <input name="title" placeholder="Challenge Title" required className="bg-zinc-800 p-2 rounded" />
            <select name="difficulty" className="bg-zinc-800 p-2 rounded">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <input name="tags" placeholder="Tags (comma separated)" className="bg-zinc-800 p-2 rounded" />
            <textarea name="description" placeholder="Description" required className="bg-zinc-800 p-2 rounded h-32" />
            <button type="submit" disabled={!isReady || isPublishing} className="bg-blue-600 p-3 rounded font-bold disabled:opacity-50">
              {isPublishing ? 'Publishing...' : 'Publish Challenge'}
            </button>
          </form>
        </div>

        <div className="flex-grow relative bg-black">
          {!isReady ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                 <p>Starting Local Container...</p>
             </div>
          ) : (
            <iframe 
              key={refreshKey}
              src={`http://localhost:${port}`} 
              className="w-full h-full border-none" 
            />
          )}
        </div>
      </div>
    </div>
  )
}
