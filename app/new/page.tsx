'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Rocket,
  GitBranch,
  Search,
  Check,
  ChevronDown,
  ArrowLeft,
  ImageIcon,
  X,
  ShieldCheck,
  Globe,
  Terminal,
  Upload,
  Info,
  SignalLow,
  SignalMedium,
  SignalHigh
} from 'lucide-react'
import { buildDraftContainer } from '@/app/actions/builder'
import { fetchGitHubRepos } from '@/app/actions/github'
import { useBuild } from '@/lib/build-context'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function NewChallengePage() {
  const router = useRouter()
  const { startTrackingBuild } = useBuild()
  const [isDeploying, setIsDeploying] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
    tags: '',
    repoUrl: '',
    thumbnailUrl: '',
    setupScript: ''
  })

  const [repos, setRepos] = useState<any[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSourceExpanded, setIsSourceExpanded] = useState(false)
  const [isScriptExpanded, setIsScriptExpanded] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setFormData({ ...formData, setupScript: content })
      setIsScriptExpanded(true)
    }
    reader.readAsText(file)
  }

  const loadRepos = async () => {
    setIsLoadingRepos(true)
    try {
      const data = await fetchGitHubRepos()
      setRepos(data)
    } catch (e) {
      console.error('Failed to load repos:', e)
    } finally {
      setIsLoadingRepos(false)
    }
  }

  useEffect(() => {
    if (isModalOpen && repos.length === 0) {
      loadRepos()
    }
  }, [isModalOpen, repos.length])

  const filteredRepos = useMemo(() => {
    if (!repoSearch) return repos
    return repos.filter(r =>
      r.full_name.toLowerCase().includes(repoSearch.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(repoSearch.toLowerCase()))
    )
  }, [repos, repoSearch])

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsDeploying(true)
    try {
      const result = await buildDraftContainer(formData)
      if (result.success && result.buildId && result.postId) {
        startTrackingBuild(result.buildId)
        router.push(`/studio/${result.postId}`)
      } else {
        alert('Failed to start deployment')
        setIsDeploying(false)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
      setIsDeploying(false)
    }
  }

  const selectedRepo = useMemo(() => {
    return repos.find(r => r.clone_url === formData.repoUrl)
  }, [formData.repoUrl, repos])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background py-12 px-4 sm:px-6 lg:px-8 text-foreground">
      <div className="mx-auto max-w-6xl">

        {/* Page Header */}
        <div
          className="mb-12 animate-fade-up"
          style={{ '--stagger': 0 } as React.CSSProperties}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-8 -ml-3 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>

          <div className="flex flex-col gap-1 border-b border-border pb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              New Workspace
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Create Challenge
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

          {/* Left Column */}
          <div
            className="lg:col-span-2 space-y-6 animate-fade-up"
            style={{ '--stagger': 1 } as React.CSSProperties}
          >
            <section className="bg-card border border-border rounded-2xl">
              <div className="p-8 space-y-8">

                {/* Title */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Challenge Title
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Debugging a Node.js Memory Leak"
                    className="w-full h-12 border border-input rounded-lg bg-muted/10 px-4 text-base font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all placeholder:text-muted-foreground/40"
                  />
                </div>

                {/* Difficulty + Tags */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Difficulty
                    </label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={value => setFormData({ ...formData, difficulty: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">
                          <div className="flex items-center gap-2">
                            <SignalLow className="size-3.5 text-emerald-500" />
                            <span>Easy</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <SignalMedium className="size-3.5 text-amber-500" />
                            <span>Medium</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="hard">
                          <div className="flex items-center gap-2">
                            <SignalHigh className="size-3.5 text-rose-500" />
                            <span>Hard</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={e => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="linux, node, performance"
                      className="w-full h-12 border border-input rounded-lg bg-muted/10 px-4 text-base font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all placeholder:text-muted-foreground/40"
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Instructions
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Explain the goals, technical constraints, and any hints for the user…"
                    className="w-full h-44 border border-input rounded-lg bg-muted/10 p-4 text-base font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all resize-none placeholder:text-muted-foreground/40"
                  />
                </div>

                {/* Thumbnail */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                    Thumbnail URL{' '}
                    <span className="normal-case tracking-normal font-normal text-muted-foreground/50">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={formData.thumbnailUrl}
                    onChange={e => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo…"
                    className="w-full h-12 border border-input rounded-lg bg-muted/10 px-4 text-base font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all placeholder:text-muted-foreground/40"
                  />
                </div>

                {/* Source Code — expandable */}
                <div className="pt-6 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsSourceExpanded(!isSourceExpanded)}
                    className="group w-full flex items-center justify-between py-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <GitBranch className={cn(
                        "size-4 transition-colors shrink-0",
                        formData.repoUrl ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">
                          {formData.repoUrl ? 'Source attached' : 'Attach source code'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formData.repoUrl
                            ? 'GitHub repository linked'
                            : 'Optionally clone a repository into the VM'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "size-4 text-muted-foreground transition-transform duration-200 shrink-0",
                      isSourceExpanded && "rotate-180"
                    )} />
                  </button>

                  {isSourceExpanded && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      {!formData.repoUrl ? (
                        <div className="py-10 border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-5 bg-muted/5">
                          <GitBranch className="size-7 text-muted-foreground/30" />
                          <div className="space-y-1.5 text-center">
                            <p className="font-semibold text-sm text-foreground">Connect a repository</p>
                            <p className="text-xs text-muted-foreground max-w-xs">
                              Import your project files to seed the workspace.
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="gap-2"
                          >
                            <Search className="size-4" />
                            Browse repositories
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-primary/5 border border-primary/20 rounded-xl gap-4 animate-in zoom-in-95 duration-200">
                          <div className="flex items-center gap-3 min-w-0">
                            <GitBranch className="size-4 text-primary shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                                Target project
                              </span>
                              <span className="text-base font-bold font-mono truncate text-foreground">
                                {selectedRepo?.full_name || formData.repoUrl.split('/').pop()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsModalOpen(true)}
                              className="h-9 px-4"
                            >
                              Switch
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setFormData({ ...formData, repoUrl: '' })}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 px-3"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Setup Script — expandable */}
                <div className="pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsScriptExpanded(!isScriptExpanded)}
                    className="group w-full flex items-center justify-between py-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Terminal className={cn(
                        "size-4 transition-colors shrink-0",
                        formData.setupScript ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">
                          {formData.setupScript ? 'Setup script configured' : 'Add setup script'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formData.setupScript
                            ? 'Custom bash script will run on launch'
                            : 'Run commands automatically when the container starts'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "size-4 text-muted-foreground transition-transform duration-200 shrink-0",
                      isScriptExpanded && "rotate-180"
                    )} />
                  </button>

                  {isScriptExpanded && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      {!formData.setupScript ? (
                        <div className="py-10 border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-5 bg-muted/5">
                          <Terminal className="size-7 text-muted-foreground/30" />
                          <div className="space-y-1.5 text-center px-4">
                            <p className="font-semibold text-sm text-foreground">Write or upload a script</p>
                            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                              Automate dependency installation and environment setup.
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setFormData({ ...formData, setupScript: '#!/bin/bash\n\n' })}
                              className="gap-2 h-10 px-5"
                            >
                              <Terminal className="size-4" />
                              Write script
                            </Button>
                            <div className="relative">
                              <input
                                type="file"
                                id="setup-script-upload-empty"
                                className="hidden"
                                accept=".sh"
                                onChange={handleFileUpload}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('setup-script-upload-empty')?.click()}
                                className="gap-2 h-10 px-5"
                              >
                                <Upload className="size-4" />
                                Upload .sh
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="relative group/script">
                            <textarea
                              value={formData.setupScript}
                              onChange={e => setFormData({ ...formData, setupScript: e.target.value })}
                              placeholder="#!/bin/bash\nnpm install && npm run dev\necho 'Ready!'"
                              className="w-full h-48 border border-input rounded-xl bg-muted/20 p-5 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all resize-none placeholder:text-muted-foreground/30 leading-relaxed shadow-inner"
                            />
                            <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover/script:opacity-100 transition-opacity">
                              <input
                                type="file"
                                id="setup-script-upload-active"
                                className="hidden"
                                accept=".sh"
                                onChange={handleFileUpload}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5 bg-background/80 backdrop-blur-md border border-border shadow-sm"
                                onClick={() => document.getElementById('setup-script-upload-active')?.click()}
                              >
                                <Upload className="size-3" />
                                Replace
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5 bg-background/80 backdrop-blur-md border border-border text-muted-foreground hover:text-destructive shadow-sm"
                                onClick={() => setFormData({ ...formData, setupScript: '' })}
                              >
                                <X className="size-3" />
                                Clear
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 px-1">
                            <Info className="size-3.5 text-primary/60 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-muted-foreground leading-normal font-medium italic">
                              Executed with root privileges as a startup init script. Ensure your script starts with #!/bin/bash.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </section>
          </div>

          {/* Right Column — Preview & Deploy */}
          <div
            className="lg:sticky lg:top-8 space-y-5 animate-fade-up"
            style={{ '--stagger': 2 } as React.CSSProperties}
          >
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-lg">

              {/* Thumbnail */}
              <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                {formData.thumbnailUrl ? (
                  <img
                    src={formData.thumbnailUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div
                      className="absolute inset-0 opacity-[0.06] dark:opacity-[0.08]"
                      style={{
                        backgroundImage:
                          'linear-gradient(oklch(0.5 0.08 165) 1px, transparent 1px), linear-gradient(90deg, oklch(0.5 0.08 165) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }}
                    />
                    <ImageIcon className="size-6 text-muted-foreground/25 relative" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/35 mt-2.5 relative">
                      No thumbnail
                    </span>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm flex items-center gap-1.5",
                    formData.difficulty === 'easy'
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : formData.difficulty === 'hard'
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  )}>
                    {formData.difficulty === 'easy' && <SignalLow className="size-3" />}
                    {formData.difficulty === 'medium' && <SignalMedium className="size-3" />}
                    {formData.difficulty === 'hard' && <SignalHigh className="size-3" />}
                    {formData.difficulty}
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="p-6 space-y-5 text-foreground">

                <h3 className="text-xl font-bold tracking-tight line-clamp-1">
                  {formData.title
                    ? formData.title
                    : <span className="text-muted-foreground/40 font-normal">Challenge Title</span>
                  }
                </h3>

                <div className="space-y-3.5 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Environment
                    </span>
                    <code className="text-xs font-mono text-foreground bg-muted/40 px-2.5 py-1.5 rounded-md border border-border/50 flex flex-col gap-1 w-fit">
                      <div className="flex items-center gap-2">
                        <Globe className="size-3 text-primary/60 shrink-0" />
                        ubuntu-xfce:stable
                      </div>
                      {formData.setupScript && (
                        <div className="flex items-center gap-2 text-[9px] text-primary/80 border-t border-border/30 pt-1 mt-1">
                          <Terminal className="size-2.5 shrink-0" />
                          Custom init script active
                        </div>
                      )}
                    </code>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Source
                      </span>
                      <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <GitBranch className="size-3 text-primary/60 shrink-0" />
                        {formData.repoUrl ? 'GitHub' : 'Base image'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Visibility
                      </span>
                      <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                        <ShieldCheck className="size-3 shrink-0" />
                        Private draft
                      </span>
                    </div>
                  </div>

                  {(formData.description || formData.tags) && (
                    <div className="pt-3 border-t border-border space-y-3">
                      {formData.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {formData.description}
                        </p>
                      )}
                      {formData.tags && (
                        <div className="flex flex-wrap gap-1.5">
                          {formData.tags.split(',').map((tag, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-primary/10 px-2 py-0.5 rounded font-semibold text-primary border border-primary/20 uppercase tracking-tight"
                            >
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  <Button
                    onClick={handleDeploy}
                    disabled={isDeploying || !formData.title}
                    size="lg"
                    className="w-full font-semibold shadow-sm transition-all active:scale-[0.98]"
                  >
                    {isDeploying ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        <span>Deploying…</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Rocket className="size-4 transition-transform group-hover/button:-translate-y-0.5 group-hover/button:translate-x-0.5" />
                        <span>Deploy Workspace</span>
                      </div>
                    )}
                  </Button>

                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed text-center">
                    Spawns a unique Linux instance. Customize before publishing.
                  </p>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Repository Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300 text-foreground">
          <div className="bg-card border border-border w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            <div className="px-7 pt-7 pb-5 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Connect repository
                </h2>
                <button
                  onClick={loadRepos}
                  disabled={isLoadingRepos}
                  className="text-[11px] font-semibold text-primary hover:underline uppercase tracking-wider mt-0.5 disabled:opacity-40"
                >
                  {isLoadingRepos ? 'Syncing…' : 'Refresh list'}
                </button>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="px-7 pt-5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search repositories…"
                  value={repoSearch}
                  onChange={e => setRepoSearch(e.target.value)}
                  className="w-full h-10 border border-input rounded-lg bg-muted/10 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background transition-all placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 max-h-[400px]">
              {isLoadingRepos ? (
                <div className="py-14 flex flex-col items-center justify-center gap-4">
                  <div className="size-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 animate-pulse">
                    Syncing
                  </p>
                </div>
              ) : filteredRepos.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {filteredRepos.map(repo => (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, repoUrl: repo.clone_url })
                        setIsModalOpen(false)
                        setRepoSearch('')
                        setIsSourceExpanded(true)
                      }}
                      className={cn(
                        "w-full text-left px-3.5 py-3 rounded-lg flex items-center justify-between hover:bg-primary/5 border border-transparent hover:border-primary/15 transition-all group",
                        formData.repoUrl === repo.clone_url && "bg-primary/5 border-primary/20"
                      )}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-4">
                        <span className="font-semibold text-sm group-hover:text-primary transition-colors text-foreground truncate">
                          {repo.full_name}
                        </span>
                        {repo.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {repo.description}
                          </span>
                        )}
                      </div>
                      {formData.repoUrl === repo.clone_url ? (
                        <Check className="size-4 text-primary shrink-0" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground/30 -rotate-90 shrink-0 group-hover:text-primary transition-colors" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-14 text-center">
                  <GitBranch className="size-7 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No repositories found</p>
                </div>
              )}
            </div>

            <div className="px-7 py-4 bg-muted/5 border-t border-border">
              <p className="text-[11px] text-muted-foreground/50 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary inline-block animate-pulse" />
                Live cloud sync active
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
