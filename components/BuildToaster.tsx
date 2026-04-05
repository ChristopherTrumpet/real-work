'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useBuild } from '@/lib/build-context'
import { 
  ChevronUp, 
  ChevronDown, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Terminal,
  Cloud
} from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

export function BuildToaster() {
  const { activeBuild, dismissBuild } = useBuild()
  const [isExpanded, setIsExpanded] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const logEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!activeBuild) return
    const clock = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(clock)
  }, [activeBuild])

  useEffect(() => {
    if (isExpanded) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeBuild?.logs.length, isExpanded])

  // Hide toaster for draft builds - draft page has its own loading state
  if (!activeBuild || activeBuild.id.startsWith('draft')) return null

  const { status, logs, result } = activeBuild
  const isPushing = logs.some(l => l.message.includes('Pushing image to cloud registry') || l.message.includes('Tagging and pushing'))
  const lastLog = logs[logs.length - 1]

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const mins = Math.floor(seconds / 60)
    const secs = (seconds % 60).toFixed(0)
    return `${mins}m ${secs}s`
  }

  const handleLaunch = () => {
    if (result?.postId) {
      router.push(`/challenge/${result.postId}`)
    } else {
      router.push('/')
    }
    dismissBuild()
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[100] w-full max-w-md bg-background border border-border rounded-xl shadow-2xl transition-all duration-300 transform animate-in slide-in-from-right-4",
      isExpanded ? "h-auto" : ""
    )}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border bg-muted/5 rounded-t-xl">
        <div className="flex items-center gap-3">
          {status === 'building' && <Loader2 className="size-5 text-primary animate-spin" />}
          {status === 'ready' && <CheckCircle2 className="size-5 text-green-500" />}
          {status === 'error' && <AlertCircle className="size-5 text-red-500" />}
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-none flex items-center gap-2">
              {status === 'building' ? 'Publishing Challenge' : 
               status === 'ready' ? 'Challenge Published' : 'Publishing Failed'}
              {isPushing && status === 'building' && (
                <span className="bg-blue-500/10 text-blue-500 text-[8px] px-1.5 py-0.5 rounded-full animate-pulse border border-blue-500/20 flex items-center gap-1">
                  <Cloud className="size-2" />
                  CLOUD SYNC
                </span>
              )}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-mono">
              {activeBuild.id}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
          <button 
            onClick={dismissBuild}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Action Button (Collapsed Success State) */}
      {status === 'ready' && !isExpanded && (
        <div className="p-4 bg-green-500/5 animate-in fade-in zoom-in-95">
          <Button 
            className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg shadow-green-500/20"
            onClick={handleLaunch}
          >
            <ExternalLink className="mr-2 size-4" />
            View Public Challenge
          </Button>
        </div>
      )}

      {/* Logs View */}
      {isExpanded && (
        <div className="flex flex-col h-[400px] animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] bg-black text-green-500 space-y-1.5 scrollbar-hide text-left">
            <div className="flex items-center gap-2 mb-4 text-zinc-500 border-b border-zinc-800 pb-2">
              <Terminal className="size-3" />
              <span>LIVE_PUBLISH_CONSOLE</span>
            </div>
            {logs.map((log, i) => {
              const isLast = i === logs.length - 1
              const elapsed = log.startedAt ? (now - log.startedAt) / 1000 : 0
              const displayDuration = log.duration || (isLast && status === 'building' ? formatDuration(elapsed) : null)
              
              return (
                <div key={i} className="flex gap-3 border-l border-green-500/20 pl-2 group">
                  <span className="text-zinc-600 shrink-0 tabular-nums">{log.timestamp}</span>
                  <span className="whitespace-pre-wrap break-all flex-1">{log.message}</span>
                  {displayDuration && (
                    <span className="text-blue-400 shrink-0 font-bold bg-blue-400/10 px-1 rounded">
                      [{displayDuration}]
                    </span>
                  )}
                </div>
              )
            })}
            <div ref={logEndRef} />
            {status === 'building' && (
              <div className="flex gap-2 items-center text-zinc-600 animate-pulse mt-2 text-left">
                <span className="w-1 h-3 bg-zinc-600 animate-caret" />
                <span>Syncing changes to cloud...</span>
              </div>
            )}
          </div>
          
          {status === 'ready' && (
            <div className="p-4 border-t border-border bg-muted/10">
              <Button 
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg shadow-green-500/20"
                onClick={handleLaunch}
              >
                Launch Public Challenge Page
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {status === 'building' && !isExpanded && (
        <div className="h-1 bg-muted overflow-hidden rounded-b-xl">
          <div className="h-full bg-primary animate-progress-indeterminate" style={{ width: '100%' }} />
        </div>
      )}
    </div>
  )
}
