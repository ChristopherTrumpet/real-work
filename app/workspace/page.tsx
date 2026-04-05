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
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white font-mono">
        <div className="text-center space-y-4">
          <p className="text-zinc-500">ERROR: NO_PORT_ASSIGNED</p>
          <Button onClick={() => router.push('/')} variant="outline" className="rounded-full">
            <ArrowLeft className="mr-2 size-4" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-3.5rem)] bg-zinc-950 overflow-hidden text-white">
      {/* Solver Header */}
      <header className="h-14 shrink-0 px-6 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-emerald-500/10 rounded text-emerald-500">
              <Shield className="size-4" />
            </div>
            <h1 className="font-bold text-xs uppercase tracking-widest text-zinc-400">Sandbox Environment</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => router.push('/')}
            variant="ghost"
            className="text-zinc-500 hover:text-white text-xs font-bold"
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
