'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Rocket, ExternalLink, GitBranch, CheckCircle2, AlertCircle, Info, Code, Play } from 'lucide-react'
import { BenchmarkResult } from '@/lib/evaluator'
import BenchmarkResults from '@/components/BenchmarkResults'
import { evaluateChallengeAction } from '@/app/actions/benchmark'
import { killContainer } from '@/app/actions/docker'

export default function ChallengePreview({ post }: { post: any }) {
  const router = useRouter()
  const [status, setStatus] = useState<'deploying' | 'ready' | 'error'>('deploying')
  const [port, setPort] = useState<string | null>(null)
  const [containerId, setContainerId] = useState<string | null>(null)
  
  // Benchmarking
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null)
  const [userCode, setUserCode] = useState('')
  const [showEval, setShowEval] = useState(false)

  useEffect(() => {
    // In a real app, we'd poll the status or use a WebSocket
    // For this prototype, we'll assume it's ready after a simulated delay 
    // or if the URL already has port/containerId from the wizard redirect
    const urlParams = new URLSearchParams(window.location.search)
    const p = urlParams.get('port')
    const c = urlParams.get('containerId')
    
    if (p && c) {
      setPort(p)
      setContainerId(c)
      setStatus('ready')
    } else {
      setTimeout(() => setStatus('ready'), 3000)
    }
  }, [])

  const handleOpenWorkspace = () => {
    if (port) {
      // Kasm usually uses https on 6901, but we've mapped it.
      // We might need to handle the self-signed cert or use a proxy.
      window.open(`https://localhost:${port}/?password=password`, '_blank')
    }
  }

  const handleRunEvaluation = async () => {
    if (!post || !containerId || !userCode) return
    setIsEvaluating(true)
    try {
      const result = await evaluateChallengeAction({
        containerId,
        language: post.benchmark_language || 'python',
        userCode,
        goldCode: post.benchmark_gold_code,
        testCases: post.benchmark_test_cases,
        timeoutMs: post.benchmark_timeout_ms || 10000
      })
      setBenchmarkResult(result)
    } catch (e: any) {
      alert('Evaluation failed: ' + e.message)
    } finally {
      setIsEvaluating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {benchmarkResult && (
        <BenchmarkResults result={benchmarkResult} onClose={() => setBenchmarkResult(null)} />
      )}

      {/* Hero Header */}
      <div className="border-b border-border bg-muted/10">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  status === 'deploying' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                  status === 'ready' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                  'bg-red-100 text-red-600 dark:bg-red-900/30'
                }`}>
                  {status}
                </span>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-muted-foreground text-xs">Production Deployment</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight">{post.title}</h1>
              <p className="text-muted-foreground max-w-2xl">{post.description}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.push('/')}>Dashboard</Button>
              <Button onClick={handleOpenWorkspace} disabled={status !== 'ready'}>
                <ExternalLink className="mr-2 size-4" />
                Open Workspace
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Left Column: Details & Benchmark */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Deployment Status Card */}
          <section className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/5">
              <h2 className="font-bold flex items-center gap-2">
                <Rocket className="size-4 text-primary" />
                Deployment Status
              </h2>
              {status === 'ready' && <CheckCircle2 className="size-5 text-green-500" />}
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Runtime</span>
                  <p className="text-sm font-mono">{post.benchmark_language || 'linux'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Difficulty</span>
                  <p className="text-sm font-semibold capitalize">{post.difficulty}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Container ID</span>
                  <p className="text-sm font-mono truncate">{containerId?.substring(0,12) || '---'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Exposed Port</span>
                  <p className="text-sm font-mono">{port || '---'}</p>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3 font-mono text-xs overflow-x-auto">
                <p className="text-green-500">[12:00:01] Preparing Kasm environment...</p>
                <p className="text-green-500">[12:00:05] Cloning repository into /home/kasm-user/workspace...</p>
                <p className="text-green-500">[12:00:12] Injecting performance benchmark library...</p>
                <p className="text-green-500">[12:00:15] Configuring VS Code server extensions...</p>
                <p className="text-blue-500">[12:00:18] Container successfully started on port {port}.</p>
                <p className="animate-pulse">_</p>
              </div>
            </div>
          </section>

          {/* Evaluation Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Test Your Solution</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowEval(!showEval)}>
                {showEval ? 'Hide Editor' : 'Show Editor'}
              </Button>
            </div>

            {showEval && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <p className="text-sm text-muted-foreground">Paste your implementation below to benchmark it against the gold standard algorithm in the live environment.</p>
                <div className="border border-border rounded-2xl overflow-hidden bg-card">
                  <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                      <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{post.benchmark_language}.solution</span>
                  </div>
                  <textarea 
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value)}
                    placeholder="// Your code here..."
                    className="w-full h-80 p-6 bg-transparent font-mono text-sm outline-none resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleRunEvaluation} disabled={isEvaluating || !userCode} className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20">
                    {isEvaluating ? (
                      <>
                        <div className="mr-2 w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Running Evaluation...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 size-4" />
                        Run Performance Benchmark
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Reference & Requirements */}
        <div className="space-y-8">
          <div className="p-6 bg-card border border-border rounded-2xl space-y-6 shadow-sm">
            <h3 className="font-bold flex items-center gap-2">
              <Info className="size-4 text-blue-500" />
              Requirements
            </h3>
            <ul className="space-y-4">
              <li className="flex gap-3 text-sm">
                <CheckCircle2 className="size-4 text-green-500 shrink-0 mt-0.5" />
                <span>The algorithm must pass all <strong>{post.benchmark_test_cases?.length || 0}</strong> test cases.</span>
              </li>
              <li className="flex gap-3 text-sm">
                <CheckCircle2 className="size-4 text-green-500 shrink-0 mt-0.5" />
                <span>Execution must complete within <strong>{post.benchmark_timeout_ms / 1000}s</strong> per test.</span>
              </li>
              <li className="flex gap-3 text-sm">
                <CheckCircle2 className="size-4 text-green-500 shrink-0 mt-0.5" />
                <span>Outputs must exactly match the gold standard STDOUT.</span>
              </li>
            </ul>
          </div>

          <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm opacity-60">
            <h3 className="font-bold flex items-center gap-2">
              <Code className="size-4 text-purple-500" />
              Benchmark Specs
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Evaluator</span>
                <span className="font-mono">python-runner v2</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Resource Limit</span>
                <span className="font-mono">1.0GB RAM</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Persistence</span>
                <span className="font-mono">Disabled</span>
              </div>
            </div>
          </div>

          <Button variant="secondary" className="w-full h-12 rounded-xl font-bold" onClick={() => router.push('/')}>
            Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  )
}
