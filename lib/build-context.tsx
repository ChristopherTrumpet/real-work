'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type BuildStatus = {
  id: string
  status: 'building' | 'ready' | 'error'
  logs: { timestamp: string; message: string; duration?: string; startedAt?: number }[]
  result?: any
}

type BuildContextType = {
  activeBuild: BuildStatus | null
  startTrackingBuild: (id: string) => void
  dismissBuild: () => void
}

const BuildContext = createContext<BuildContextType | undefined>(undefined)

export function BuildProvider({ children }: { children: React.ReactNode }) {
  const [activeBuild, setActiveBuild] = useState<BuildStatus | null>(null)
  const [now, setNow] = useState(Date.now())
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(clock)
  }, [])

  const startTrackingBuild = (id: string) => {
    setActiveBuild({ id, status: 'building', logs: [] })
    
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/build-logs?id=${id}`)
        if (!res.ok) return
        
        const data = await res.json()
        setActiveBuild(prev => ({
          ...prev!,
          status: data.status,
          logs: data.logs || [],
          result: data.result
        }))

        if (data.status === 'ready' || data.status === 'error') {
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch (e) {
        console.error('Polling error:', e)
      }
    }, 1000)
  }

  const dismissBuild = () => {
    setActiveBuild(null)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  return (
    <BuildContext.Provider value={{ activeBuild, startTrackingBuild, dismissBuild }}>
      {children}
    </BuildContext.Provider>
  )
}

export function useBuild() {
  const context = useContext(BuildContext)
  if (context === undefined) {
    throw new Error('useBuild must be used within a BuildProvider')
  }
  return context
}
