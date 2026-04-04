'use client'

import React, { useState, useRef, useEffect } from 'react'

export default function DraggableWindow({ src }: { src: string }) {
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const resizeStartSize = useRef({ width: 0, height: 0 })
  const windowRef = useRef<HTMLDivElement>(null)

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
        <span className="text-sm font-medium pointer-events-none">Container Preview (Port 4000)</span>
        <div className="flex gap-2 pointer-events-none">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow relative bg-white">
        {/* Overlay to prevent iframe from stealing mouse events during drag/resize */}
        {(isDragging || isResizing) && (
          <div className="absolute inset-0 z-20" />
        )}
        <iframe
          src={src}
          className="w-full h-full border-none"
          title="Container Iframe"
        />
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
