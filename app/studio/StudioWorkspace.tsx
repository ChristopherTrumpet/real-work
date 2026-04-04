'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-java'

import { publishChallenge } from '@/app/actions/studio'
import { killContainer, isContainerReady } from '@/app/actions/docker'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Rocket, Info } from 'lucide-react'

/*
 * STEP-BY-STEP PROCESS: SETTING UP A CHALLENGE CONTAINER FOR BENCHMARKING
 * ----------------------------------------------------------------------
 * 1. BASE IMAGE: Use a container image that has the required compilers/runtimes:
 *    - C: gcc
 *    - TypeScript: node, npx, ts-node
 *    - Rust: rustc
 *    - Java: javac, java
 *    - Python: python3
 * 2. WORKING DIRECTORY: The benchmarker default is /tmp/benchmark. Ensure 
 *    the container user has write permissions to /tmp or the configured workdir.
 * 3. PYTHON3: The benchmarker requires 'python3' to be available in the container 
 *    path to run the injected evaluator script.
 * 4. STANDARD I/O: The challenge algorithm should read from STDIN and print 
 *    to STDOUT. The gold standard and user implementation must match outputs exactly.
 * 5. PERSISTENCE: Any files needed for the challenge should be placed in the 
 *    container's persistent volume (default /config) during the Studio session.
 */

export default function StudioWorkspace() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const port = searchParams.get('port')
  const containerId = searchParams.get('containerId')

  const [isLeaving, setIsLeaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [showBenchmark, setShowBenchmark] = useState(false)
  
  // Benchmark state
  const [goldCode, setGoldCode] = useState('')
  const [benchmarkLang, setBenchmarkLang] = useState('python')

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

  const handleCancel = async () => {
    if (port) {
      setIsLeaving(true)
      await killContainer(parseInt(port))
    }
    router.push('/')
  }

  const handlePublish = async (formData: FormData) => {
    setIsPublishing(true)
    // Manually add the gold standard code to the form data
    formData.append('benchmarkGoldCode', goldCode)
    try {
      await publishChallenge(formData)
    } catch (e) {
      setIsPublishing(false)
    }
  }

  const getPrismLang = (lang: string) => {
    switch(lang) {
      case 'typescript': return languages.typescript
      case 'c': return languages.c
      case 'rust': return languages.rust
      case 'java': return languages.java
      default: return languages.python
    }
  }

  if (!port || !containerId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Studio Not Found</h2>
          <Button asChild>
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-3.5rem)] bg-background overflow-hidden text-foreground">
      {/* Prism Theme Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .prism-editor-wrapper .prism-editor__textarea, .prism-editor-wrapper .prism-editor__editor {
          padding: 10px !important;
        }
        pre[class*="language-"], code[class*="language-"] {
          color: #ccc;
          background: none;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 13px;
          text-align: left;
          white-space: pre;
          word-spacing: normal;
          word-break: normal;
          word-wrap: normal;
          line-height: 1.5;
          tab-size: 4;
          hyphens: none;
        }
        .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #999; }
        .token.punctuation { color: #ccc; }
        .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol, .token.deleted { color: #f92672; }
        .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted { color: #a6e22e; }
        .token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string { color: #f8f8f2; }
        .token.atrule, .token.attr-value, .token.keyword { color: #66d9ef; }
        .token.function, .token.class-name { color: #e6db74; }
        .token.regex, .token.important, .token.variable { color: #fd971f; }
      `}} />

      {/* Top Nav */}
      <nav className="h-14 shrink-0 px-6 bg-muted/30 backdrop-blur-sm flex justify-between items-center border-b border-border z-50">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-sm tracking-tight flex items-center gap-2">
            <span className="p-1 bg-primary/10 rounded-md text-primary"><Rocket className="size-4" /></span>
            Studio Mode
          </h1>
          <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border uppercase">
            {containerId.substring(0,12)}
          </span>
        </div>
        <Button 
          variant="destructive" 
          size="sm"
          onClick={handleCancel} 
          disabled={isLeaving || isPublishing}
          className="rounded-full h-8"
        >
          {isLeaving ? 'Discarding...' : 'Cancel & Discard'}
        </Button>
      </nav>
      
      <div className="flex flex-grow w-full h-[calc(100vh-7rem)] overflow-hidden">
        {/* Left Panel: Form */}
        <div className="w-[450px] shrink-0 bg-background border-r border-border flex flex-col overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold tracking-tight">Configure Challenge</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Define the goals, parameters, and reference algorithms to publish this challenge.
            </p>
          </div>

          <form action={handlePublish} className="flex flex-col gap-5 p-6 flex-grow overflow-y-auto">
            <input type="hidden" name="containerId" value={containerId} />
            
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-xs font-semibold text-foreground">Challenge Title</label>
              <input 
                id="title" 
                name="title" 
                type="text" 
                placeholder="e.g. Optimized Sorting Task" 
                required 
                disabled={isPublishing || isLeaving}
                className="w-full h-10 border border-input rounded-lg bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="difficulty" className="text-xs font-semibold text-foreground">Difficulty</label>
                <select 
                  id="difficulty" 
                  name="difficulty" 
                  required
                  disabled={isPublishing || isLeaving}
                  className="w-full h-10 border border-input rounded-lg bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="tags" className="text-xs font-semibold text-foreground">Tags</label>
                <input 
                  id="tags" 
                  name="tags" 
                  type="text" 
                  placeholder="algorithms, rust" 
                  disabled={isPublishing || isLeaving}
                  className="w-full h-10 border border-input rounded-lg bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-xs font-semibold text-foreground">Instructions</label>
              <textarea 
                id="description" 
                name="description" 
                placeholder="Explain the requirements..." 
                required 
                disabled={isPublishing || isLeaving}
                className="w-full h-32 border border-input rounded-lg bg-background p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none" 
              />
            </div>

            {/* Benchmark Section */}
            <div className="border border-border rounded-xl bg-muted/10 overflow-hidden">
              <button 
                type="button"
                onClick={() => setShowBenchmark(!showBenchmark)}
                className="w-full flex items-center justify-between p-4 text-xs font-bold text-foreground hover:bg-muted/30 transition-colors uppercase tracking-wider"
              >
                Benchmark Configuration
                {showBenchmark ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>

              {showBenchmark && (
                <div className="p-4 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1.5">
                    <label htmlFor="benchmarkLanguage" className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Target Language</label>
                    <select 
                      id="benchmarkLanguage" 
                      name="benchmarkLanguage" 
                      value={benchmarkLang}
                      onChange={(e) => setBenchmarkLang(e.target.value)}
                      disabled={isPublishing || isLeaving}
                      className="w-full h-9 border border-input rounded bg-background px-2 text-xs outline-none"
                    >
                      <option value="python">Python</option>
                      <option value="typescript">TypeScript</option>
                      <option value="c">C</option>
                      <option value="rust">Rust</option>
                      <option value="java">Java</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                      Gold Standard Code
                      <div className="group relative">
                        <Info className="size-3 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] normal-case tracking-normal">
                          This reference code will be used to verify correctness of user submissions.
                        </div>
                      </div>
                    </label>
                    <div className="min-h-[200px] border border-input rounded-md bg-[#1e1e1e] overflow-hidden">
                      <Editor
                        value={goldCode}
                        onValueChange={code => setGoldCode(code)}
                        highlight={code => highlight(code, getPrismLang(benchmarkLang), benchmarkLang)}
                        padding={10}
                        style={{
                          fontFamily: '"Fira code", "Fira Mono", monospace',
                          fontSize: 12,
                          minHeight: '200px'
                        }}
                        textareaClassName="outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="benchmarkTestCases" className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Test Cases (JSON Array)</label>
                    <textarea 
                      id="benchmarkTestCases" 
                      name="benchmarkTestCases" 
                      placeholder='["stdin_1", "stdin_2"]' 
                      disabled={isPublishing || isLeaving}
                      className="w-full h-20 border border-input rounded bg-background p-2 text-xs outline-none font-mono resize-none" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="benchmarkTimeout" className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Timeout (ms)</label>
                    <input 
                      id="benchmarkTimeout" 
                      name="benchmarkTimeout" 
                      type="number" 
                      defaultValue="10000"
                      disabled={isPublishing || isLeaving}
                      className="w-full h-9 border border-input rounded bg-background px-2 text-xs outline-none" 
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border mt-auto">
              <Button 
                type="submit" 
                disabled={isPublishing || isLeaving || !isReady}
                className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/20"
              >
                {isPublishing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : 'Publish Challenge'}
              </Button>
              <p className="text-center text-[10px] text-muted-foreground mt-3 italic">
                Environment changes within the persistent volume will be baked into the final image.
              </p>
            </div>
          </form>
        </div>

        {/* Right Panel: Iframe Workspace */}
        <div className="flex-grow relative bg-muted/20">
          {!isReady ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                 <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                 <h3 className="text-sm font-medium">Booting Studio Environment...</h3>
             </div>
          ) : (
            <iframe 
              src={`http://localhost:${port}`} 
              className="w-full h-full border-none"
              title="Studio Workspace"
            />
          )}
        </div>
      </div>
    </div>
  )
}
