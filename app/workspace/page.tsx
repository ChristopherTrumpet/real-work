'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Rocket, Shield, Info, ArrowLeft } from 'lucide-react'

export default function WorkspacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const port = searchParams.get('port')
  
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
        <iframe 
          src={`http://127.0.0.1:${port}`} 
          className="w-full h-full border-none"
          title="Challenge Workspace"
        />
      </main>
    </div>
  )
}
