'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Rocket, 
  GitBranch, 
  Settings, 
  Info, 
  Box, 
  Search, 
  Check, 
  ChevronDown, 
  ChevronRight,
  ImageIcon, 
  Layout, 
  Tag, 
  BarChart3,
  X,
  ShieldCheck,
  Globe
} from 'lucide-react'
import { buildDraftContainer } from '@/app/actions/builder'
import { fetchGitHubRepos } from '@/app/actions/github'
import { useBuild } from '@/lib/build-context'
import { cn } from '@/lib/utils'

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
    thumbnailUrl: ''
  })

  // GitHub Repo states
  const [repos, setRepos] = useState<any[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSourceExpanded, setIsSourceExpanded] = useState(false)

  useEffect(() => {
    if (isModalOpen && repos.length === 0) {
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
    <div className="min-h-[calc(100vh-3.5rem)] bg-background py-12 px-4 sm:px-6 lg:px-8 relative text-foreground">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 bg-primary/10 rounded-lg text-primary shadow-sm border border-primary/20">
            <Box className="size-7" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Create Challenge</h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium text-balance opacity-80">Design your custom playground and initialize your draft workspace.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Left Column: Configuration */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/5 flex items-center gap-2">
                <Settings className="size-4 text-primary" />
                <h2 className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">Challenge Configuration</h2>
              </div>
              
              <div className="p-8 space-y-10">
                {/* Basic Info Section */}
                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-3">
                    <label className="text-sm font-bold flex items-center gap-2 text-foreground/80">
                      <Layout className="size-4 text-primary/60" />
                      Challenge Title
                    </label>
                    <input 
                      required
                      type="text" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. Debugging a Node.js Memory Leak"
                      className="w-full h-14 border border-input rounded-lg bg-muted/10 px-5 text-base font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-sm font-bold flex items-center gap-2 text-foreground/80">
                        <BarChart3 className="size-4 text-primary/60" />
                        Difficulty Level
                      </label>
                      <div className="relative">
                        <select 
                          value={formData.difficulty}
                          onChange={e => setFormData({...formData, difficulty: e.target.value})}
                          className="w-full h-14 border border-input rounded-lg bg-muted/10 px-5 text-base font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all appearance-none"
                        >
                          <option value="easy">🟢 Easy</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="hard">🔴 Hard</option>
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-bold flex items-center gap-2 text-foreground/80">
                        <Tag className="size-4 text-primary/60" />
                        Categories / Tags
                      </label>
                      <input 
                        type="text" 
                        value={formData.tags}
                        onChange={e => setFormData({...formData, tags: e.target.value})}
                        placeholder="linux, node, performance"
                        className="w-full h-14 border border-input rounded-lg bg-muted/10 px-5 text-base font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all" 
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold flex items-center gap-2 text-foreground/80">
                      <Info className="size-4 text-primary/60" />
                      Detailed Instructions
                    </label>
                    <textarea 
                      required
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Explain the goals, technical constraints, and any hints for the user..."
                      className="w-full h-48 border border-input rounded-lg bg-muted/10 p-6 text-base font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all resize-none" 
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold flex items-center gap-2 text-foreground/80">
                      <ImageIcon className="size-4 text-primary/60" />
                      Thumbnail URL (Optional)
                    </label>
                    <input 
                      type="url" 
                      value={formData.thumbnailUrl}
                      onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                      placeholder="https://images.unsplash.com/photo..."
                      className="w-full h-14 border border-input rounded-lg bg-muted/10 px-5 text-base font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all" 
                    />
                  </div>
                </div>

                {/* Inline Expandable Source Code Section */}
                <div className="pt-8 border-t border-border text-foreground">
                  <button 
                    type="button"
                    onClick={() => setIsSourceExpanded(!isSourceExpanded)}
                    className="group w-full flex items-center justify-between p-6 bg-muted/10 hover:bg-muted/20 border border-border rounded-lg transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-lg transition-colors",
                        formData.repoUrl ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                      )}>
                        <GitBranch className="size-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm uppercase tracking-widest text-foreground">
                          {formData.repoUrl ? 'Source Attached' : 'Attach Source Code'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium opacity-70">
                          {formData.repoUrl ? 'GitHub project linked successfully' : 'Optionally clone a GitHub repository into the VM'}
                        </p>
                      </div>
                    </div>
                    {isSourceExpanded ? (
                      <ChevronDown className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    ) : (
                      <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </button>

                  {isSourceExpanded && (
                    <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                      {!formData.repoUrl ? (
                        <div className="p-10 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-6 bg-muted/5 text-center text-foreground">
                          <div className="p-5 bg-background rounded-full shadow-inner border border-border">
                            <GitBranch className="size-10 text-muted-foreground/30" />
                          </div>
                          <div className="space-y-2 text-foreground">
                            <p className="font-bold text-lg">GitHub Integration</p>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto opacity-80">
                              Quickly find and import your project files to jumpstart the challenge workspace.
                            </p>
                          </div>
                          <Button 
                            type="button" 
                            onClick={() => setIsModalOpen(true)}
                            className="h-12 px-8 rounded-lg font-black shadow-lg shadow-primary/20 gap-3"
                          >
                            <Search className="size-4" />
                            Search Your Repositories
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-primary/5 border border-primary/20 rounded-lg gap-6 animate-in zoom-in-95">
                          <div className="flex items-center gap-5">
                            <div className="p-4 bg-primary text-white rounded-lg shadow-xl shadow-primary/30">
                              <GitBranch className="size-6" />
                            </div>
                            <div className="flex flex-col text-foreground">
                              <span className="text-[10px] font-black uppercase text-primary tracking-widest">Target Project</span>
                              <span className="text-lg font-bold font-mono truncate max-w-[300px]">
                                {selectedRepo?.full_name || formData.repoUrl.split('/').pop()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button 
                              type="button"
                              variant="outline" 
                              onClick={() => setIsModalOpen(true)}
                              className="rounded-lg font-bold px-5 h-10"
                            >
                              Switch
                            </Button>
                            <Button 
                              type="button"
                              variant="ghost" 
                              onClick={() => setFormData({...formData, repoUrl: ''})}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg px-4 h-10"
                            >
                              Disconnect
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Summary & Deploy */}
          <div className="lg:sticky lg:top-8 space-y-6">
            <div className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col border-t-primary/20">
              {/* Thumbnail Preview */}
              <div className="aspect-[16/10] bg-muted relative group overflow-hidden">
                {formData.thumbnailUrl ? (
                  <img 
                    src={formData.thumbnailUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40 gap-3 bg-gradient-to-br from-muted/50 to-muted">
                    <div className="p-5 bg-background/50 rounded-full border-2 border-dashed border-muted-foreground/20 backdrop-blur-sm">
                      <ImageIcon className="size-10" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-center px-4 italic">Live UI Snapshot</span>
                  </div>
                )}
                <div className="absolute top-5 left-5">
                  <span className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-xl shadow-lg",
                    formData.difficulty === 'easy' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                    formData.difficulty === 'hard' ? "bg-rose-500/20 text-rose-400 border-rose-500/30" :
                    "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  )}>
                    {formData.difficulty}
                  </span>
                </div>
              </div>

              {/* Summary Details */}
              <div className="p-8 space-y-8 text-foreground">
                <div className="space-y-2 text-center lg:text-left">
                  <h3 className="text-2xl font-black tracking-tight line-clamp-1 text-foreground">
                    {formData.title || "Challenge Title"}
                  </h3>
                  <div className="h-1 w-16 bg-primary rounded-full mx-auto lg:mx-0" />
                </div>

                <div className="space-y-5">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Environment</span>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground bg-muted/50 p-3 rounded-lg border border-border text-center lg:text-left">
                      <Globe className="size-3 text-primary/60" />
                      ubuntu-xfce:stable
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Source</span>
                      <span className="text-xs font-bold text-foreground flex items-center gap-2 truncate">
                        <GitBranch className="size-3 text-primary/60" />
                        {formData.repoUrl ? "GitHub Repo" : "Standard Base"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Access</span>
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-2">
                        <ShieldCheck className="size-3" />
                        Private Draft
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 text-foreground">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Summary</span>
                    <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed font-medium italic opacity-80">
                      {formData.description || "Enter challenge details to populate this live preview summary..."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {formData.tags ? formData.tags.split(',').map((tag, i) => (
                      <span key={i} className="text-[9px] bg-primary/10 px-2.5 py-1 rounded font-black text-primary border border-primary/20 uppercase tracking-tighter shadow-sm">
                        #{tag.trim()}
                      </span>
                    )) : (
                      <span className="text-[10px] text-muted-foreground italic font-medium">No tags defined</span>
                    )}
                  </div>
                </div>

                <div className="pt-4 space-y-5">
                  <Button 
                    onClick={handleDeploy} 
                    disabled={isDeploying || !formData.title}
                    className="w-full h-16 text-xl font-black rounded-lg shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90 text-primary-foreground group overflow-hidden relative"
                  >
                    {isDeploying ? (
                      <>
                        <div className="absolute inset-0 bg-primary-foreground/10 animate-pulse" />
                        <div className="relative flex items-center justify-center gap-3">
                          <div className="size-5 border-3 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          <span>Deploying...</span>
                        </div>
                      </>
                    ) : (
                      <div className="relative flex items-center justify-center gap-3 text-foreground">
                        <Rocket className="size-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        <span>Deploy Workspace</span>
                      </div>
                    )}
                  </Button>
                  
                  <div className="flex items-start gap-4 p-5 bg-muted/30 rounded-lg border border-border shadow-inner">
                    <div className="p-2.5 bg-background rounded-lg shadow-sm shrink-0 border border-border/50">
                      <ShieldCheck className="size-4 text-emerald-500" />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium opacity-80">
                      Deployment spawns a unique Linux instance. You can customize the environment before final publication.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Repository Search Popup (Modal) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300 text-foreground">
          <div className="bg-card border border-border w-full max-w-2xl rounded-lg shadow-[0_0_100px_-12px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-10 border-b border-border bg-muted/5 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-primary/10 rounded-lg text-primary shadow-inner">
                  <GitBranch className="size-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-foreground uppercase tracking-widest">Connect Repository</h2>
                  <p className="text-xs text-muted-foreground font-bold mt-1 uppercase tracking-widest opacity-60">Source Code Integration</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-4 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="size-7" />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-10 pb-0">
              <div className="relative group text-foreground">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Search your repositories by name..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="w-full h-16 border-2 border-input rounded-lg bg-muted/10 pl-16 pr-6 text-lg font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-background transition-all shadow-inner placeholder:font-medium placeholder:text-muted-foreground/50 text-foreground"
                />
              </div>
            </div>

            {/* Repository List */}
            <div className="flex-1 overflow-y-auto p-10 pt-8 max-h-[450px] custom-scrollbar">
              <div className="grid grid-cols-1 gap-3">
                {isLoadingRepos ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-6">
                    <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60 animate-pulse">Syncing GitHub</p>
                  </div>
                ) : filteredRepos.length > 0 ? (
                  filteredRepos.map((repo) => (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => {
                        setFormData({...formData, repoUrl: repo.clone_url})
                        setIsModalOpen(false)
                        setRepoSearch('')
                        setIsSourceExpanded(true)
                      }}
                      className={cn(
                        "w-full text-left p-6 rounded-lg flex items-center justify-between hover:bg-primary/5 border-2 border-transparent hover:border-primary/20 transition-all group shadow-sm",
                        formData.repoUrl === repo.clone_url && "bg-primary/5 border-primary/30"
                      )}
                    >
                      <div className="flex flex-col gap-1.5 pr-6">
                        <span className="font-black text-base group-hover:text-primary transition-colors text-foreground">
                          {repo.full_name}
                        </span>
                        {repo.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1 font-medium italic opacity-80">
                            {repo.description}
                          </span>
                        )}
                      </div>
                      {formData.repoUrl === repo.clone_url ? (
                        <div className="p-2 bg-primary rounded-full text-white shadow-lg shadow-primary/20">
                          <Check className="size-5" />
                        </div>
                      ) : (
                        <div className="p-2 bg-muted/50 rounded-full group-hover:bg-primary group-hover:text-white transition-all transform group-hover:scale-110">
                          <ChevronRight className="size-5" />
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="py-24 text-center space-y-4 bg-muted/5 rounded-lg border-2 border-dashed border-border opacity-50 text-foreground">
                    <GitBranch className="size-12 mx-auto text-muted-foreground/30" />
                    <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">No Projects Found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-muted/5 border-t border-border flex justify-center text-foreground">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Live Cloud Sync Active
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
