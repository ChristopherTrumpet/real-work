'use client'

import React, { useState, useRef, useEffect } from 'react'
import { isContainerReady, killContainer, getDockerHostIp } from '@/app/actions/docker'

// Define the props for our component
interface DraggableWindowProps {
  port: string;
  onClose: () => void;
}

export default function DraggableWindow({ port, onClose }: DraggableWindowProps) {
  const [isReady, setIsReady] = useState(false)
  const [refreshKey, setRefreshKey] = useState(Date.now())
  const [isKilling, setIsKilling] = useState(false)
  const [dockerHostIp, setDockerHostIp] = useState('localhost')

  // Window state
  const [isMaximized, setIsMaximized] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [size, setSize] = useState({ width: 960, height: 720 })
  const lastState = useRef({ x: 0, y: 0, width: 0, height: 0 })

  // Drag/Resize state
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const resizeStartSize = useRef({ width: 0, height: 0 })
  const windowRef = useRef<HTMLDivElement>(null)
  
  const src = `http://localhost:${port}`

  useEffect(() => {
    async function fetchIp() {
      const ip = await getDockerHostIp()
      setDockerHostIp(ip)
    }
    fetchIp()
  }, [])

  // Reset readiness when port changes
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
          timeoutId = setTimeout(() => {
            if (isMounted) {
              setIsReady(true)
              setRefreshKey(Date.now())
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
    setRefreshKey(Date.now())
  }

  // Action handlers for window buttons
  const handleClose = async () => {
    setIsKilling(true)
    await killContainer(parseInt(port))
    onClose()
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const handleMaximize = () => {
    if (isMaximized) {
      // Restore
      setPosition({ x: lastState.current.x, y: lastState.current.y })
      setSize({ width: lastState.current.width, height: lastState.current.height })
    } else {
      // Maximize
      lastState.current = { x: position.x, y: position.y, width: size.width, height: size.height }
      const parent = windowRef.current?.parentElement
      if (parent) {
        setPosition({ x: 0, y: 0 })
        setSize({ width: parent.clientWidth, height: parent.clientHeight })
      }
    }
    setIsMaximized(!isMaximized)
  }

  // Drag and Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).classList.contains('window-header')) {
      setIsDragging(true)
      dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    }
  }

  const handleResizeDown = (e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault()
    setIsResizing(true)
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    resizeStartSize.current = { width: size.width, height: size.height }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({ x: e.clientX - dragStartPos.current.x, y: e.clientY - dragStartPos.current.y })
      }
      if (isResizing) {
        const deltaX = e.clientX - dragStartPos.current.x
        const deltaY = e.clientY - dragStartPos.current.y
        setSize({
          width: Math.max(400, resizeStartSize.current.width + deltaX),
          height: Math.max(300, resizeStartSize.current.height + deltaY)
        })
      }
    }
    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing])

  return (
    <div
      ref={windowRef}
      className={`absolute bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg shadow-2xl flex flex-col overflow-hidden ${!isDragging && !isResizing ? 'transition-all duration-300' : ''} ${isMaximized ? 'rounded-none' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: isMinimized ? 'auto' : size.height,
        zIndex: isDragging || isResizing ? 50 : 10
      }}
    >
      {/* Window Header */}
      <div 
        onMouseDown={handleMouseDown}
        onDoubleClick={handleMaximize}
        className={`window-header bg-gray-800 text-white p-2 flex justify-between items-center select-none ${isMaximized ? 'cursor-default' : 'cursor-move'}`}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          {isKilling ? (
             <span className="text-xs bg-red-600 px-2 py-0.5 rounded animate-pulse">Terminating...</span>
          ): (
            <>
              <span className="text-sm font-medium">Port {port}</span>
              {!isReady && <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded animate-pulse">Waiting...</span>}
              {isReady && <span className="text-xs bg-green-600 px-2 py-0.5 rounded">Running</span>}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isReady && !isKilling && (
            <button 
              onClick={handleRefresh}
              className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded transition-colors"
            >
              Refresh
            </button>
          )}
          <div className="flex items-center gap-2">
            <button title="Minimize" onClick={handleMinimize} className="w-4 h-4 rounded-full bg-yellow-500 hover:bg-yellow-400" />
            <button title="Maximize" onClick={handleMaximize} className="w-4 h-4 rounded-full bg-green-500 hover:bg-green-400" />
            <button title="Close & Kill Container" onClick={handleClose} className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-400" />
          </div>
        </div>
      </div>

      {/* Content Area */}
      {!isMinimized && (
        <div className="flex-grow relative bg-gray-200 dark:bg-black">
          {(isDragging || isResizing) && <div className="absolute inset-0 z-20" />}
          
          {!isReady ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p>Initializing application...</p>
            </div>
          ) : (
            <iframe key={refreshKey} src={src} className="w-full h-full border-none" title="Container Preview" />
          )}
        </div>
      )}

      {/* Resize Handle */}
      {!isMaximized && !isMinimized && (
        <div onMouseDown={handleResizeDown} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-30" />
      )}
    </div>
  )
}
