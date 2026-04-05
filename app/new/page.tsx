'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronRight, GitBranch, Code, LayoutTemplate, Settings, Play } from 'lucide-react'
import { fetchGitHubRepos, fetchRepoTree, fetchFileContent } from '@/app/actions/github'
import { parseFunctionHeaders } from '@/app/actions/ast'
import { buildChallengeContainer } from '@/app/actions/builder'
import { signInWithGitHub } from '@/app/actions/auth'
import { useBuild } from '@/lib/build-context'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-java'

const VM_TEMPLATES = [
  { id: 'static', name: 'Static Website (HTML/CSS/JS)', icon: '🌐', lang: 'javascript' },
  { id: 'node', name: 'Node.js (Frontend/Backend)', icon: '📦', lang: 'typescript' },
  { id: 'python', name: 'Python Environment', icon: '🐍', lang: 'python' },
  { id: 'c', name: 'C/C++ Environment', icon: '⚙️', lang: 'c' },
  { id: 'rust', name: 'Rust Environment', icon: '🦀', lang: 'rust' },
  { id: 'java', name: 'Java Environment', icon: '☕', lang: 'java' },
  { id: 'linux', name: 'Blank Linux (Ubuntu)', icon: '🐧', lang: 'python' }
]

export default function NewChallengeWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  
  // Step 1: Repo
  const [repos, setRepos] = useState<any[]>([])
  const [selectedRepo, setSelectedRepo] = useState<any>(null)
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [repoUrlInput, setRepoUrlInput] = useState('')

  // Step 2: Template
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

  // Step 3: Files & AST
  const [tree, setTree] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [scrapedHeaders, setScrapedHeaders] = useState<{name: string, signature: string}[]>([])
  const [goldCode, setGoldCode] = useState('')

  // Step 4: Details
  const [details, setDetails] = useState({
    title: '',
    difficulty: 'medium',
    tags: '',
    description: '',
    testCases: '["1", "2"]',
    timeout: '10000',
    thumbnailUrl: ''
  })

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false)

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadThumbnail = async (): Promise<string | null> => {
    if (!thumbnailFile) return null
    setIsUploadingThumbnail(true)
    try {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileExt = thumbnailFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, thumbnailFile)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (e: any) {
      alert('Thumbnail upload failed: ' + e.message)
      return null
    } finally {
      setIsUploadingThumbnail(false)
    }
  }

  const [isGitHubLinked, setIsGitHubLinked] = useState(false)

  useEffect(() => {
    loadRepos()
    checkGitHubLink()
  }, [])

  const checkGitHubLink = async () => {
    try {
      const { data: { session } } = await (await import('@/utils/supabase/client')).createClient().auth.getSession()
      if (session?.provider_token) {
        setIsGitHubLinked(true)
      }
    } catch (e) {}
  }

  const loadRepos = async (url?: string) => {
    setIsLoadingRepos(true)
    try {
      const data = await fetchGitHubRepos(url)
      setRepos(data)
      if (data && data.length > 0) {
        setIsGitHubLinked(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingRepos(false)
    }
  }

  const handleLinkGitHub = async () => {
    try {
      const url = await signInWithGitHub()
      if (url) window.location.href = url
    } catch (e: any) {
      alert('Failed to link GitHub: ' + e.message)
    }
  }

  const handleRepoSelect = async (repo: any) => {
    setSelectedRepo(repo)
    setStep(2)
  }

  const handleTemplateSelect = async (template: any) => {
    setSelectedTemplate(template)
    setStep(3)
    // Fetch repo tree
    try {
      const t = await fetchRepoTree(selectedRepo.full_name, selectedRepo.default_branch)
      setTree(t)
    } catch (e) {
      alert('Failed to fetch repo tree')
    }
  }

  const handleFileSelect = async (file: any) => {
    setSelectedFile(file)
    try {
      const content = await fetchFileContent(selectedRepo.full_name, file.path)
      const headers = await parseFunctionHeaders(content, selectedTemplate.lang)
      setScrapedHeaders(headers)
    } catch (e) {
      alert('Failed to parse file')
    }
  }

  const handleInsertBoilerplate = (header: {name: string, signature: string, boilerplate: string}) => {
    setGoldCode(prev => prev ? prev + '\n\n' + header.boilerplate : header.boilerplate)
  }

  const [isDeploying, setIsDeploying] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!isDeploying) return
    const interval = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(interval)
  }, [isDeploying])

  const { activeBuild, startTrackingBuild } = useBuild()

  const handleDeploy = async () => {
    setIsDeploying(true)
    try {
      let finalThumbnailUrl = details.thumbnailUrl
      if (thumbnailFile) {
        const uploadedUrl = await uploadThumbnail()
        if (uploadedUrl) finalThumbnailUrl = uploadedUrl
      }

      const result = await buildChallengeContainer({
        repoUrl: selectedRepo.clone_url,
        templateId: selectedTemplate.id,
        benchmarkLang: selectedTemplate.lang,
        goldCode,
        details: { ...details, thumbnailUrl: finalThumbnailUrl }
      })
      
      if (result.success && result.buildId) {
        startTrackingBuild(result.buildId)
        router.push('/profile')
      } else {
        alert('Deployment failed to start')
        setIsDeploying(false)
      }
    } catch (e: any) {
      alert('Deployment failed: ' + e.message)
      setIsDeploying(false)
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

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted/20 flex flex-col items-center py-12 px-4 sm:px-6">
      <style dangerouslySetInnerHTML={{ __html: `
        .prism-editor-wrapper .prism-editor__textarea, .prism-editor-wrapper .prism-editor__editor { padding: 16px !important; }
        pre[class*="language-"], code[class*="language-"] { color: #ccc; background: none; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 14px; text-align: left; white-space: pre; word-spacing: normal; word-break: normal; word-wrap: normal; line-height: 1.5; tab-size: 4; hyphens: none; }
        .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #999; }
        .token.punctuation { color: #ccc; }
        .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol, .token.deleted { color: #f92672; }
        .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted { color: #a6e22e; }
        .token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string { color: #f8f8f2; }
        .token.atrule, .token.attr-value, .token.keyword { color: #66d9ef; }
        .token.function, .token.class-name { color: #e6db74; }
        .token.regex, .token.important, .token.variable { color: #fd971f; }
      `}} />

      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Create Challenge</h1>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2">
          {[
            { n: 1, label: 'Import Git Repository', icon: GitBranch },
            { n: 2, label: 'VM Template', icon: LayoutTemplate },
            { n: 3, label: 'Files & Algorithm', icon: Code },
            { n: 4, label: 'Details & Deploy', icon: Settings },
          ].map((s, i) => (
            <React.Fragment key={s.n}>
              <div className={`flex items-center gap-2 shrink-0 ${step >= s.n ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= s.n ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <s.icon className="size-4" />
                </div>
                <span className="text-sm font-semibold">{s.label}</span>
              </div>
              {i < 3 && <div className={`w-12 h-px shrink-0 ${step > s.n ? 'bg-primary' : 'bg-border'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Repo */}
        {step === 1 && (
          <div className="bg-background border border-border rounded-xl shadow-sm p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Import Git Repository</h2>
              {!isGitHubLinked && (
                <Button variant="outline" size="sm" onClick={handleLinkGitHub} className="gap-2">
                  <GitBranch className="size-4" />
                  Link GitHub Account
                </Button>
              )}
            </div>
            <div className="flex gap-3 mb-8">
              <input 
                type="text" 
                placeholder="Paste public GitHub URL (e.g. owner/repo)" 
                value={repoUrlInput}
                onChange={(e) => setRepoUrlInput(e.target.value)}
                className="flex-1 h-10 border border-input rounded-lg bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button onClick={() => loadRepos(repoUrlInput)} disabled={isLoadingRepos}>
                {isLoadingRepos ? 'Loading...' : 'Import'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repos.length > 0 ? repos.map(r => (
                <div key={r.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <GitBranch className="size-5 shrink-0 text-muted-foreground" />
                    <span className="font-medium text-sm truncate">{r.full_name}</span>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleRepoSelect(r)}>Select</Button>
                </div>
              )) : (
                <div className="col-span-full text-center py-10 text-muted-foreground text-sm">
                  {isLoadingRepos ? 'Fetching repositories...' : 'No repositories found. Ensure your GitHub is linked or paste a public URL.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Template */}
        {step === 2 && (
          <div className="bg-background border border-border rounded-xl shadow-sm p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Select VM Template</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Back</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {VM_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateSelect(t)}
                  className="flex flex-col items-center justify-center gap-3 p-6 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <span className="text-4xl">{t.icon}</span>
                  <span className="font-semibold text-sm">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Files & AST */}
        {step === 3 && (
          <div className="bg-background border border-border rounded-xl shadow-sm p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Configure Algorithm Verification</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>Back</Button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Directory Browser */}
              <div className="w-full md:w-1/3 border border-border rounded-lg flex flex-col h-96 overflow-hidden bg-muted/10">
                <div className="bg-muted p-3 font-semibold text-xs border-b border-border">Repository Files</div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                  {tree.map((file) => (
                    <button 
                      key={file.path} 
                      onClick={() => handleFileSelect(file)}
                      className={`w-full text-left px-3 py-2 text-xs rounded transition-colors truncate ${selectedFile?.path === file.path ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted'}`}
                    >
                      📄 {file.path}
                    </button>
                  ))}
                </div>
              </div>

              {/* Function Scraper & Gold Code */}
              <div className="flex-1 flex flex-col gap-6">
                {selectedFile ? (
                  <>
                    <div className="bg-muted/30 border border-border p-4 rounded-lg">
                      <h3 className="text-sm font-semibold mb-3 flex items-center justify-between">
                        Detected Functions
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">{selectedFile.path}</span>
                      </h3>
                      {scrapedHeaders.length > 0 ? (
                        <div className="space-y-2">
                          {scrapedHeaders.map((h: any, i) => (
                            <button 
                              key={i} 
                              onClick={() => handleInsertBoilerplate(h)}
                              className="w-full text-left text-xs font-mono bg-background border border-border p-2 rounded text-primary hover:border-primary/50 transition-colors"
                              title="Click to insert boilerplate"
                            >
                              {h.signature}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No supported function headers found in this file.</p>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col min-h-[200px]">
                      <h3 className="text-sm font-semibold mb-2">Gold Standard Implementation</h3>
                      <div className="flex-1 border border-border rounded-lg bg-[#1e1e1e] overflow-hidden min-h-[200px]">
                        <Editor
                          value={goldCode}
                          onValueChange={setGoldCode}
                          highlight={code => highlight(code, getPrismLang(selectedTemplate.lang), selectedTemplate.lang)}
                          padding={16}
                          style={{ fontFamily: '"Fira code", "Fira Mono", monospace', fontSize: 14 }}
                          textareaClassName="outline-none"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground text-sm">
                    Select a file from the repository to extract function headers.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <Button onClick={() => setStep(4)} disabled={!goldCode}>Continue to Details</Button>
            </div>
          </div>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <div className="bg-background border border-border rounded-xl shadow-sm p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Challenge Details</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>Back</Button>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Challenge Title</label>
                <input 
                  type="text" 
                  value={details.title}
                  onChange={e => setDetails({...details, title: e.target.value})}
                  className="w-full h-10 border border-input rounded-lg bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Difficulty</label>
                  <select 
                    value={details.difficulty}
                    onChange={e => setDetails({...details, difficulty: e.target.value})}
                    className="w-full h-10 border border-input rounded-lg bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Tags (comma separated)</label>
                  <input 
                    type="text" 
                    value={details.tags}
                    onChange={e => setDetails({...details, tags: e.target.value})}
                    className="w-full h-10 border border-input rounded-lg bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Challenge Thumbnail</label>
                <div className="flex flex-col gap-4">
                  {thumbnailPreview && (
                    <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-border bg-muted">
                      <img src={thumbnailPreview} alt="Thumbnail preview" className="h-full w-full object-cover" />
                      <button 
                        onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }}
                        className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                      >
                        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="hidden" 
                      id="thumbnail-upload"
                    />
                    <label 
                      htmlFor="thumbnail-upload"
                      className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      {thumbnailPreview ? 'Change Image' : 'Upload Thumbnail'}
                    </label>
                    <p className="text-xs text-muted-foreground italic">Recommended: 1280x720 (16:9)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Instructions</label>
                <textarea 
                  value={details.description}
                  onChange={e => setDetails({...details, description: e.target.value})}
                  className="w-full h-32 border border-input rounded-lg bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Test Cases (JSON)</label>
                  <textarea 
                    value={details.testCases}
                    onChange={e => setDetails({...details, testCases: e.target.value})}
                    className="w-full h-16 border border-input rounded-lg bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono resize-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Timeout (ms)</label>
                  <input 
                    type="number" 
                    value={details.timeout}
                    onChange={e => setDetails({...details, timeout: e.target.value})}
                    className="w-full h-10 border border-input rounded-lg bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <Button 
                  onClick={handleDeploy} 
                  disabled={!details.title || isDeploying}
                  className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 mb-6"
                >
                  {isDeploying ? 'Deploying Challenge...' : 'Deploy Challenge Environment'}
                  {!isDeploying && <Play className="ml-2 size-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
