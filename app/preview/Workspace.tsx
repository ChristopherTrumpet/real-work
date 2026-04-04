'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DraggableWindow from '@/components/DraggableWindow'
import { killContainer } from '@/app/actions/docker'

export default function PreviewWorkspace() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPort = searchParams.get('port')
  
  // For now, we only manage one window at a time based on the URL
  const [port, setPort] = useState<string | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Set the port from the URL when the page loads
    // This simple logic can be expanded to manage multiple windows
    setPort(initialPort)
  }, [initialPort])

  const handleClose = () => {
    setPort(null)
    // Optional: Update URL to reflect the closed window
    window.history.replaceState(null, '', '/preview')
  }

  const handleBackToDashboard = async () => {
    if (port) {
      setIsLeaving(true)
      await killContainer(parseInt(port))
    }
    router.push('/')
  }

  return (
    <div className="flex flex-col w-full h-screen bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
      <nav className="h-16 shrink-0 px-4 bg-gray-900/80 backdrop-blur-sm text-white flex justify-between items-center z-[100]">
        <h1 className="font-bold">Dynamic Container Workspace</h1>
        <button 
          onClick={handleBackToDashboard} 
          disabled={isLeaving}
          className="text-sm bg-gray-700 px-3 py-1 rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          {isLeaving ? 'Saving & Returning...' : 'Back to Dashboard'}
        </button>
      </nav>
      
      <div className="relative flex-grow w-full h-full">
        {port ? (
          <DraggableWindow 
            port={port}
            onClose={handleClose}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <h2 className="text-2xl font-bold">Workspace Empty</h2>
              <p className="mt-2">Deploy a new container from the dashboard to begin.</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-4 left-4 text-xs text-gray-400 pointer-events-none">
          Drag the header to move • Use the bottom-right corner to resize
        </div>
      </div>
    </div>
  )
}

