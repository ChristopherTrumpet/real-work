'use server'

import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { createClient } from '@/utils/supabase/server'
import { initBuild, appendLog, finishBuild, failBuild } from '@/lib/build-logs'

const execAsync = promisify(exec)

/**
 * Captures the state of a draft container, builds a multi-platform image,
 * and pushes it to the cloud registry.
 */
export async function publishChallenge(postId: string, containerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const buildId = `publish-${Date.now()}`
  const registry = '150.136.116.136:5000'
  const finalImageName = `${registry}/challenge-${user.id.substring(0,8).toLowerCase()}-${Date.now()}`
  
  initBuild(buildId)
  
  // Run the publishing process in the background
  runPublishProcess(buildId, postId, containerId, finalImageName)

  return { success: true, buildId }
}

async function runPublishProcess(buildId: string, postId: string, containerId: string, imageName: string) {
  const supabase = await createClient()

  try {
    appendLog(buildId, `Capturing workspace state...`, true)
    
    // 1. Commit the running container to a temporary image
    const tempTag = `temp-commit-${Date.now()}`
    await execAsync(`docker commit ${containerId} ${tempTag}`)
    appendLog(buildId, `Workspace state captured successfully.`)

    // 2. Build multi-platform image using the committed state as base
    appendLog(buildId, `Tagging and pushing to cloud registry...`, true)
    await execAsync(`docker tag ${tempTag} ${imageName}`)
    
    await new Promise((resolve, reject) => {
      const child = spawn('docker', ['push', imageName])
      child.stdout.on('data', (data) => appendLog(buildId, `[push] ${data.toString().trim()}`))
      child.stderr.on('data', (data) => appendLog(buildId, `[push-stderr] ${data.toString().trim()}`))
      child.on('close', (code) => {
        if (code === 0) resolve(true)
        else reject(new Error(`Cloud push failed with code ${code}`))
      })
    })

    // 3. Update database
    appendLog(buildId, `Updating challenge status...`, true)
    const { error } = await supabase
      .from('posts')
      .update({
        content_url: imageName,
        is_draft: false
      })
      .eq('id', postId)

    if (error) throw new Error('Database update failed: ' + error.message)

    // 4. Cleanup
    appendLog(buildId, `Cleaning up temporary resources...`, true)
    await execAsync(`docker stop ${containerId} && docker rm ${containerId}`)
    await execAsync(`docker rmi ${tempTag}`)

    finishBuild(buildId, { postId })

  } catch (error: any) {
    console.error('Publish Error:', error)
    failBuild(buildId, error.message || String(error))
  }
}
