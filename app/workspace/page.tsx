'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Rocket, Shield, ArrowLeft } from 'lucide-react'
import { isContainerReady, killContainer } from '@/app/actions/docker'
import { createClient } from '@/utils/supabase/client'

export default function WorkspacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const port = searchParams.get('port')
  const postId = searchParams.get('postId')
  const [hostname] = useState(() => typeof window !== 'undefined' ? window.location.hostname : 'localhost')
  const [isReady, setIsReady] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // Listen for completion in Supabase Realtime
  useEffect(() => {
    if (!postId) return
    
    console.log(`[workspace] Subscribing to completions for post ${postId}`);
    const supabase = createClient()
    
    const channel = supabase
      .channel('completion-detect')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_completions',
          filter: `post_id=eq.${postId}`
        },
        async (payload) => {
          console.log(`[workspace] Completion detected in DB:`, payload.new);
          // Verify it's the current user
          const { data: { user } } = await supabase.auth.getUser()
          if (payload.new.user_id === user?.id && !isCompleting) {
            console.log(`[workspace] Matching user completion found. Redirecting...`);
            setIsCompleting(true)
            router.push(`/challenge/${postId}/complete`)
          }
        }
      )
      .subscribe((status) => {
        console.log(`[workspace] Realtime status: ${status}`);
      })

    return () => {
      console.log(`[workspace] Unsubscribing from completions`);
      supabase.removeChannel(channel)
    }
  }, [postId, router, isCompleting])

  // Poll for container readiness
  useEffect(() => {
    if (!port || isReady) return
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const checkReady = async () => {
      try {
        const ready = await isContainerReady(parseInt(port))
        if (ready && isMounted) {
          // Extra buffer for internal services to boot
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
  }, [port, isReady])
  
  if (!port) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-sm">No port assigned to this session.</p>
          <Button onClick={() => router.push('/')} variant="outline" className="rounded-full">
            <ArrowLeft className="mr-2 size-4" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-3.5rem)] bg-background overflow-hidden text-foreground">
      {/* Solver Header */}
      <header className="h-14 shrink-0 px-6 border-b border-border bg-card flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-primary/10 rounded text-primary">
              <Shield className="size-4" />
            </div>
            <h1 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Sandbox Environment</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push('/')}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground text-xs font-bold"
          >
            Leave Session
          </Button>
        </div>
      </header>

      {/* Main VM Embed */}
      <main className="flex-1 bg-black relative">
        {isReady ? (
          <iframe 
            key={`${hostname}-${port}`}
            src={`http://${hostname}:${port}`} 
            className="w-full h-full border-none"
            title="Challenge Workspace"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-border border-t-primary rounded-full animate-spin" />
              <Rocket className="absolute inset-0 m-auto size-8 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary">Booting Sandbox Environment</p>
              <p className="text-[10px] font-mono text-muted-foreground italic">Setting up secure container...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
