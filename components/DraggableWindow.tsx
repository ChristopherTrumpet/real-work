'use client'

import React, { useState, useRef, useEffect } from 'react'
import { isContainerReady } from '@/app/actions/docker'

export default function DraggableWindow({ src, port }: { src: string, port?: string }) {
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [isReady, setIsReady] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const resizeStartSize = useRef({ width: 0, height: 0 })
  const windowRef = useRef<HTMLDivElement>(null)

  // Reset readiness when port changes to trigger new polling
  useEffect(() => {
    setIsReady(false)
  }, [port])

  // Poll for container readiness
  useEffect(() => {
    if (!port || isReady) return
    
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const checkReady = async () => {
      try {
        const ready = await isContainerReady(parseInt(port))
        if (ready && isMounted) {
          // TCP is open, but wait 2 seconds for the HTTP server to actually start responding
          // This prevents the iframe from loading a "Connection Refused" page.
          timeoutId = setTimeout(() => {
            if (isMounted) {
              setIsReady(true)
              setRefreshKey(prev => Date.now()) // Force iframe refresh
            }
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
  }, [port, isReady])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('window-header')) {
      setIsDragging(true)
      dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    }
  }

  const handleResizeDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    resizeStartSize.current = { width: size.width, height: size.height }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y
        })
      }
      if (isResizing) {
        const deltaX = e.clientX - dragStartPos.current.x
        const deltaY = e.clientY - dragStartPos.current.y
        setSize({
          width: Math.max(300, resizeStartSize.current.width + deltaX),
          height: Math.max(200, resizeStartSize.current.height + deltaY)
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing])

  return (
    <div
      ref={windowRef}
      className="absolute bg-white border border-gray-300 rounded-lg shadow-2xl flex flex-col overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: isDragging || isResizing ? 50 : 10
      }}
    >
      {/* Window Header / Drag Handle */}
      <div 
        onMouseDown={handleMouseDown}
        className="window-header bg-gray-800 text-white p-2 cursor-move flex justify-between items-center select-none"
      >
        <div className="flex items-center gap-2 pointer-events-none">
            <span className="text-sm font-medium">Container Preview (Port {port || '4000'})</span>
            {!isReady && (
                <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded animate-pulse">Waiting for container...</span>
            )}
            {isReady && (
                <span className="text-xs bg-green-600 px-2 py-0.5 rounded">Running</span>
            )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded transition-colors"
          >
            Refresh
          </button>
          <div className="flex gap-2 pointer-events-none">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow relative bg-white">
        {/* Overlay to prevent iframe from stealing mouse events during drag/resize */}
        {(isDragging || isResizing) && (
          <div className="absolute inset-0 z-20" />
        )}
        
        {!isReady ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p>Initializing application...</p>
                <p className="text-xs mt-2 italic">This may take up to a minute for large containers.</p>
            </div>
        ) : (
            <iframe
                key={refreshKey}
                src={src}
                className="w-full h-full border-none"
                title="Container Iframe"
            />
        )}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeDown}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-gray-400"
        style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
      />
    </div>
  )
}

