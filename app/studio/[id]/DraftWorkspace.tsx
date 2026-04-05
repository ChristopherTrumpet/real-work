'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Rocket, 
  Key, 
  Terminal, 
  Info, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  ChevronRight
} from 'lucide-react'
import { publishChallenge } from '@/app/actions/publish'
import { useBuild } from '@/lib/build-context'
import { cn } from '@/lib/utils'

export default function DraftWorkspace({ post }: { post: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeBuild, startTrackingBuild } = useBuild()
  
  const [port, setPort] = useState<string | null>(searchParams.get('port'))
  const [containerId, setContainerId] = useState<string | null>(searchParams.get('containerId'))
  const [copied, setCopied] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  // Sync state from active build if it finishes while we are on this page
  useEffect(() => {
    if (activeBuild?.status === 'ready' && activeBuild.result?.postId === post.id) {
      setPort(activeBuild.result.port)
      setContainerId(activeBuild.result.containerId)
    }
  }, [activeBuild, post.id])

  const handleCopyKey = () => {
    navigator.clipboard.writeText(post.api_key || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePublish = async () => {
    if (!containerId) {
      alert('Workspace container not found. Please wait for the environment to initialize.')
      return
    }
    setIsPublishing(true)
    try {
      const result = await publishChallenge(post.id, containerId)
      if (result.success && result.buildId) {
        startTrackingBuild(result.buildId)
        router.push('/')
      }
    } catch (e: any) {
      alert('Publishing failed: ' + e.message)
      setIsPublishing(false)
    }
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-3.5rem)] bg-zinc-950 overflow-hidden text-white">
      {/* Header / Toolbar */}
      <header className="h-16 shrink-0 px-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <h1 className="font-bold text-sm tracking-tight uppercase text-zinc-400">Draft Workspace</h1>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-xs font-mono text-zinc-500 truncate max-w-[200px] md:max-w-none">{post.title}</span>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={handlePublish}
            disabled={isPublishing || !containerId}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-bold shadow-lg shadow-blue-500/20 gap-2 h-9 border-none transition-all hover:scale-105 active:scale-95"
          >
            {isPublishing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Rocket className="size-4" />
            )}
            Publish to Cloud
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: API & Instructions */}
        <aside className="w-full md:w-[380px] shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900/30 overflow-y-auto custom-scrollbar hidden md:flex">
          <div className="p-6 space-y-8">
            {/* API Key Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <Key className="size-4" />
                <h2 className="text-xs font-bold uppercase tracking-widest">Workspace API Key</h2>
              </div>
              <div className="p-4 bg-black/40 border border-zinc-800 rounded-xl space-y-3 shadow-inner">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-[10px] font-mono text-blue-400 break-all leading-relaxed">
                    {post.api_key}
                  </code>
                  <button 
                    onClick={handleCopyKey}
                    className="shrink-0 p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-white"
                  >
                    {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                Use this key to authenticate benchmark requests from within your containerized algorithms.
              </p>
            </section>

            <div className="h-px bg-zinc-800" />

            {/* Usage Instructions */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <Terminal className="size-4" />
                <h2 className="text-xs font-bold uppercase tracking-widest">Usage Example</h2>
              </div>
              <div className="space-y-3">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-[10px] text-zinc-400 leading-relaxed overflow-x-auto whitespace-pre italic">
                  {`curl -X POST /api/evaluate \\
  -H "X-API-KEY: ${post.api_key?.substring(0, 8)}..." \\
  -d '{
    "code": "...",
    "language": "python",
    "testCases": ["1", "2"]
  }'`}
                </div>
                <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-400/80 leading-relaxed font-medium">
                    Changes made to files in <strong>VS Code</strong> or via the <strong>Terminal</strong> will be captured when you click Publish.
                  </p>
                </div>
              </div>
            </section>

            {/* Verification Checklist */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <ShieldCheck className="size-4 text-emerald-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest">Pre-Publish Checklist</h2>
              </div>
              <ul className="space-y-3">
                {[
                  'Code exists in /workspace',
                  'Environment dependencies installed',
                  'Benchmark scripts verified',
                  'Challenge description updated'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium">
                    <ChevronRight className="size-3 text-zinc-700" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </aside>

        {/* Main VM Embed */}
        <main className="flex-1 bg-black relative">
          {port ? (
            <iframe 
              src={`http://127.0.0.1:${port}`} 
              className="w-full h-full border-none shadow-2xl animate-in fade-in duration-700"
              title="Challenge Workspace"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
                <Rocket className="absolute inset-0 m-auto size-8 text-blue-500 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-500">Initializing environment</p>
                {activeBuild?.logs && activeBuild.logs.length > 0 && (
                  <p className="text-[10px] font-mono text-zinc-500 italic max-w-xs truncate mx-auto px-4">
                    {activeBuild.logs[activeBuild.logs.length - 1].message}
                  </p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
