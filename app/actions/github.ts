'use server'

import { createClient } from '@/utils/supabase/server'

export async function fetchGitHubRepos(usernameOrUrl?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  // Retrieve provider token if available
  const { data: sessionData } = await supabase.auth.getSession()
  const providerToken = sessionData.session?.provider_token

  let repos: any[] = []
  
  if (usernameOrUrl) {
    // If user provided a specific URL or username, parse it
    let owner = usernameOrUrl
    if (usernameOrUrl.includes('github.com/')) {
      const parts = usernameOrUrl.split('github.com/')[1].split('/')
      owner = parts[0]
      if (parts[1]) {
        // Just fetch that specific repo
        const res = await fetch(`https://api.github.com/repos/${owner}/${parts[1]}`, {
          headers: providerToken ? { Authorization: `Bearer ${providerToken}` } : {}
        })
        if (res.ok) repos = [await res.json()]
        return repos
      }
    }
    
    // Fetch user's public repos
    const res = await fetch(`https://api.github.com/users/${owner}/repos?sort=updated&per_page=100`, {
      headers: providerToken ? { Authorization: `Bearer ${providerToken}` } : {}
    })
    if (res.ok) repos = await res.json()
  } else {
    // Attempt to fetch using provider token first (includes private repos)
    if (providerToken) {
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: { Authorization: `Bearer ${providerToken}` }
      })
      if (res.ok) repos = await res.json()
    }
    
    // Fallback: use GitHub username from metadata if token is missing/expired
    if (repos.length === 0) {
      const ghUsername = user.user_metadata?.user_name || user.user_metadata?.preferred_username || user.user_metadata?.full_name?.split(' ').join('')
      if (ghUsername) {
        console.log(`Attempting public repo fetch for user: ${ghUsername}`)
        try {
          const res = await fetch(`https://api.github.com/users/${ghUsername}/repos?sort=updated&per_page=100`)
          if (res.ok) {
            repos = await res.json()
          } else {
            const errorData = await res.json()
            console.error('GitHub API error during fallback:', errorData)
          }
        } catch (fetchError) {
          console.error('Network error during GitHub fallback:', fetchError)
        }
      } else {
        console.warn('Could not determine GitHub username from user metadata.')
      }
    }
  }

  if (!Array.isArray(repos)) {
    console.error('GitHub API returned non-array response:', repos)
    return []
  }

  if (repos.length === 0) {
    console.warn('No repositories found for this account.')
  }

  return repos.map((r: any) => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    html_url: r.html_url,
    private: r.private,
    default_branch: r.default_branch,
    clone_url: r.clone_url
  }))
}

export async function fetchRepoTree(fullName: string, branch: string) {
  const supabase = await createClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const providerToken = sessionData.session?.provider_token

  const res = await fetch(`https://api.github.com/repos/${fullName}/git/trees/${branch}?recursive=1`, {
    headers: providerToken ? { Authorization: `Bearer ${providerToken}` } : {}
  })
  
  if (!res.ok) throw new Error('Failed to fetch repository tree')
  
  const data = await res.json()
  return data.tree.filter((item: any) => item.type === 'blob') // Only return files
}

export async function fetchFileContent(fullName: string, path: string) {
  const supabase = await createClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const providerToken = sessionData.session?.provider_token

  const res = await fetch(`https://api.github.com/repos/${fullName}/contents/${path}`, {
    headers: providerToken ? { Authorization: `Bearer ${providerToken}` } : {}
  })
  
  if (!res.ok) throw new Error('Failed to fetch file content')
  
  const data = await res.json()
  if (data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8')
  }
  return data.content
}
