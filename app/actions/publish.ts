'use server'

import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { createClient } from '@/utils/supabase/server'
import { initBuild, appendLog, finishBuild, failBuild } from '@/lib/build-logs'

const execAsync = promisify(exec)

/**
 * Captures the state of a draft container using 'docker commit' and pushes it to the cloud registry.
 * This creates a perfect "clone" of the creator's workspace, preserving all manual changes.
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
    appendLog(buildId, `Capturing manual changes (cloning workspace)...`, true)
    
    // 1. Core "Clone" Command: Commit to a unique local tag
    // We use a unique local tag to ensure buildx doesn't try to pull the image from the registry
    const localSnapshotTag = `local-capture-${postId}`
    await execAsync(`docker commit ${containerId} ${localSnapshotTag}`)
    appendLog(buildId, `Workspace snapshot captured successfully.`)

    // 2. Push to the cloud registry using buildx
    // We use buildx build with a simple FROM to handle the insecure registry synchronization.
    // This is the "specific clause" needed for HTTP registries.
    appendLog(buildId, `Synchronizing snapshot to cloud registry...`, true)
    
    await new Promise((resolve, reject) => {
      const child = spawn('docker', [
        'buildx', 'build',
        '--push',
        '--tag', imageName,
        '--output', 'registry.insecure=true',
        '-' // Read Dockerfile from stdin
      ])
      
      // Inherit from the local snapshot we just created
      child.stdin.write(`FROM ${localSnapshotTag}`)
      child.stdin.end()
      
      child.stdout.on('data', (data) => appendLog(buildId, `[cloud] ${data.toString().trim()}`))
      child.stderr.on('data', (data) => {
        const msg = data.toString().trim()
        if (msg) appendLog(buildId, `[cloud-log] ${msg}`)
      })
      
      child.on('close', (code) => {
        if (code === 0) resolve(true)
        else reject(new Error(`Cloud synchronization failed with code ${code}.`))
      })
    })

    // 3. Update database
    appendLog(buildId, `Updating challenge metadata...`, true)
    const { error } = await supabase
      .from('posts')
      .update({
        content_url: imageName,
        is_draft: false
      })
      .eq('id', postId)

    if (error) throw new Error('Database update failed: ' + error.message)

    // 4. Cleanup local draft resources
    appendLog(buildId, `Cleaning up temporary resources...`, true)
    try {
      await execAsync(`docker stop ${containerId} && docker rm ${containerId}`)
      await execAsync(`docker rmi ${localSnapshotTag}`)
    } catch (e) {}

    finishBuild(buildId, { postId })

  } catch (error: any) {
    console.error('Publish Error:', error)
    failBuild(buildId, error.message || String(error))
  }
}
