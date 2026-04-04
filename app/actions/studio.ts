'use server'

import { exec } from 'child_process'
import { promisify } from 'util'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * posts.user_id FK targets profiles(id), not auth.users. If the signup trigger
 * never ran (or failed), publishing would error. Create a minimal row when missing.
 */
async function ensureAuthUserProfile(supabase: ServerClient, userId: string) {
  const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (data) return null

  const { error } = await supabase.from('profiles').insert({ id: userId })
  if (error?.code === '23505') return null
  return error
}

export async function startStudioSession() {
// ... same as before
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const image = 'challenge01'
  const internalPort = '3000'
  let hostPort = ''
  let containerId = ''

  try {
    const runCmd = `docker run -d --shm-size="1gb" -p 0:${internalPort} ${image}`
    const { stdout: runStdout } = await execAsync(runCmd)
    containerId = runStdout.trim()

    let permSuccess = false;
    for (let i = 0; i < 5; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const chmodCmd = `docker exec -u root ${containerId} chmod -R 777 /config`
        await execAsync(chmodCmd)
        permSuccess = true;
        break; 
      } catch (permError) {}
    }

    const portCmd = `docker port ${containerId} ${internalPort}`
    const { stdout: portStdout } = await execAsync(portCmd)
    const match = portStdout.match(/:(\d+)/)
    if (!match) throw new Error('Could not determine assigned host port')
    hostPort = match[1]
  } catch (error: any) {
    console.error('Studio Error:', error)
    redirect('/error?message=' + encodeURIComponent('Failed to start studio: ' + (error.stderr || error.message)))
  }

  redirect(`/studio?port=${hostPort}&containerId=${containerId}`)
}

export async function publishChallenge(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/error?message=' + encodeURIComponent('You must be logged in to publish'))
  }

  const containerId = formData.get('containerId') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const difficulty = formData.get('difficulty') as string
  const tagsStr = formData.get('tags') as string
  
  // Benchmark fields
  const benchmarkLanguage = formData.get('benchmarkLanguage') as string
  const benchmarkGoldCode = formData.get('benchmarkGoldCode') as string
  const benchmarkTestCases = formData.get('benchmarkTestCases') as string
  const benchmarkTimeout = formData.get('benchmarkTimeout') as string

  if (!containerId || !title) {
    redirect('/error?message=' + encodeURIComponent('Missing required fields'))
  }

  const tags = tagsStr 
    ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) 
    : []

  const imageName = `user-${user.id.substring(0,8).toLowerCase()}-${Date.now()}`

  try {
    // ... (docker logic remains the same)
  } catch (error: any) {
    console.error('Docker commit error:', error)
    redirect('/error?message=' + encodeURIComponent('Failed to save container image: ' + (error.stderr || error.message)))
  }

  const profileErr = await ensureAuthUserProfile(supabase, user.id)
  if (profileErr) {
    redirect(
      '/error?message=' +
        encodeURIComponent(
          'Could not create your profile row: ' +
            profileErr.message +
            ' (posts require a matching profiles row).'
        )
    )
  }

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    title,
    description,
    difficulty,
    tags,
    content_url: imageName,
    benchmark_language: benchmarkLanguage || null,
    benchmark_gold_code: benchmarkGoldCode || null,
    benchmark_test_cases: benchmarkTestCases ? JSON.parse(benchmarkTestCases) : null,
    benchmark_timeout_ms: benchmarkTimeout ? parseInt(benchmarkTimeout) : null
  })

  if (error) {
    redirect('/error?message=' + encodeURIComponent(error.message))
  }

  redirect('/')
}

