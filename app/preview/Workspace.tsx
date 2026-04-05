'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DraggableWindow from '@/components/DraggableWindow'
import { CommentThread } from '@/components/CommentThread'
import { ReadOnlyStarRating } from '@/components/read-only-star-rating'
import { killContainer, isContainerReady, getContainerIdByPort } from '@/app/actions/docker'
import { submitCompletion } from '@/app/actions/preview'
import { evaluateChallengeAction } from '@/app/actions/benchmark'
import { BenchmarkResult } from '@/lib/evaluator'
import BenchmarkResults from '@/components/BenchmarkResults'

export default function PreviewWorkspace({
  post,
  comments,
  currentUserId,
  canDiscuss = false,
  basePath = '/preview',
}: {
  post?: any
  comments?: any[]
  currentUserId?: string | null
  /** True when the user has completed this challenge (can post and reply in the sidebar). */
  canDiscuss?: boolean
  /** Route prefix for clearing the URL when closing a port-only session (e.g. `/studio` or `/preview`). */
  basePath?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPort = searchParams.get('port')
  
  const [port, setPort] = useState<string | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isReady, setIsReady] = useState(false)
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const flatComments = useMemo(
    () =>
      (comments ?? []).map((row: any) => {
        const p = row.profiles
        const profileRow = Array.isArray(p) ? p[0] : p
        return {
          id: row.id,
          user_id: row.user_id,
          parent_id: (row.parent_id as string | null) ?? null,
          body: row.body,
          created_at: row.created_at,
          profiles: profileRow as { username: string | null; full_name: string | null } | null,
        }
      }),
    [comments]
  )

  // Benchmarking state
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null)
  const [userCode, setUserCode] = useState('')
  const [showEvalModal, setShowEvalModal] = useState(false)

  useEffect(() => {
    setPort(initialPort)
  }, [initialPort])

  useEffect(() => {
    if (!port) return
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const checkReady = async () => {
      try {
        const ready = await isContainerReady(parseInt(port))
        if (ready && isMounted) {
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
  }, [port])

  const handleClose = () => {
    setPort(null)
    window.history.replaceState(null, '', basePath)
  }

  const handleBackToDashboard = async () => {
    if (port) {
      setIsLeaving(true)
      await killContainer(parseInt(port))
    }
    router.push('/')
  }

  const handleComplete = async () => {
    if (!post || !port) return
    setIsSubmitting(true)
    try {
      const result = await submitCompletion(post.id)
      if (result && 'error' in result && result.error) {
        alert(result.error)
        return
      }
      await killContainer(parseInt(port, 10))
      setPort(null)
      window.history.replaceState(null, '', basePath)
      router.push(`/challenge/${post.id}/complete`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRunEvaluation = async () => {
    if (!post || !port || !userCode) return
    
    setIsEvaluating(true)
    try {
      const containerId = await getContainerIdByPort(parseInt(port))
      if (!containerId) throw new Error('Could not find active container')

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
    <div className="flex flex-col w-full h-[calc(100vh-3.5rem)] bg-zinc-100 dark:bg-zinc-900 overflow-hidden text-zinc-900 dark:text-zinc-100">
      {benchmarkResult && (
        <BenchmarkResults result={benchmarkResult} onClose={() => setBenchmarkResult(null)} />
      )}

      {showEvalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold">Submit for Performance Evaluation</h2>
            <p className="text-sm text-zinc-500">Paste your algorithm implementation below to test it against the gold standard and benchmark its performance.</p>
            
            <textarea 
              className="w-full h-64 p-4 font-mono text-sm bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              placeholder={`Paste your ${post?.benchmark_language || 'code'} here...`}
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
            />

            <div className="flex justify-end gap-3 mt-2">
              <button 
                onClick={() => setShowEvalModal(false)}
                className="px-6 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleRunEvaluation}
                disabled={isEvaluating || !userCode}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isEvaluating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Running Benchmarks...
                  </>
                ) : 'Run Performance Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="h-16 shrink-0 px-6 bg-gray-900/95 backdrop-blur-sm text-white flex justify-between items-center border-b border-gray-800 z-50">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg tracking-tight">
            {basePath === '/studio' ? 'Studio workspace' : 'Active Workspace'}
          </h1>
          {post && (
             <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full border border-zinc-700">
               {post.title}
             </span>
          )}
        </div>
        <button 
          onClick={handleBackToDashboard} 
          disabled={isLeaving}
          className="text-sm bg-gray-700 px-4 py-2 rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          {isLeaving ? 'Saving Session...' : 'Save & Return to Dashboard'}
        </button>
      </nav>
      
      <div className="flex flex-grow w-full h-[calc(100vh-7.5rem)] overflow-hidden">
        
        {/* Optional Left Panel for Post Details */}
        {post && (
          <div className="w-[400px] shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-6 flex flex-col overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{post.title}</h2>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  post.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  post.difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {post.difficulty || 'medium'}
                </span>
                <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                   By {post.profiles?.username || 'Unknown'}
                </span>
              </div>
              
              <div className="prose dark:prose-invert text-sm text-zinc-600 dark:text-zinc-400 mb-6 whitespace-pre-wrap">
                {post.description}
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold mb-3 text-sm">Challenge Controls</h3>
                
                {post.benchmark_gold_code && (
                  <button 
                    onClick={() => setShowEvalModal(true)}
                    disabled={!isReady}
                    className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 mb-3 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Evaluate Performance
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isSubmitting || !isReady}
                  className="mb-4 w-full rounded-lg bg-green-600 p-3 font-bold text-white shadow-lg shadow-green-500/20 transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Finishing…' : 'Mark as completed'}
                </button>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Stops the workspace and opens the completion page to rate the challenge. After you&apos;ve solved
                  it once, you can also discuss with other solvers here and on the challenge page.
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <ReadOnlyStarRating
                averageRating={post.average_rating}
                ratingsCount={post.ratings_count}
                className="mb-6"
                size="sm"
              />
              <CommentThread
                postId={post.id}
                flatComments={flatComments}
                currentUserId={currentUserId ?? null}
                readOnly={!canDiscuss}
                title="Discussion"
                compact
              />
            </div>
          </div>
        )}

        {/* Right Panel: Iframe Workspace */}
        <div className="flex-grow relative bg-zinc-200 dark:bg-black">
          {!post && port && (
             <DraggableWindow port={port} onClose={handleClose} />
          )}

          {post && (
            !isReady ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                   <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
                   <h3 className="text-xl font-bold mb-2 text-zinc-800 dark:text-zinc-200">Booting Environment...</h3>
                   <p className="text-sm italic">This may take a moment.</p>
               </div>
            ) : (
              <iframe 
                src={`http://localhost:${port}`} 
                className="w-full h-full border-none"
                title="Active Workspace"
              />
            )
          )}
          
          {!port && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <h2 className="text-2xl font-bold">Workspace Empty</h2>
                <p className="mt-2">Deploy a new container from the dashboard to begin.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


