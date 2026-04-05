'use server'

import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { createClient } from '@/utils/supabase/server'
import { initBuild, appendLog, finishBuild, failBuild } from '@/lib/build-logs'

const execAsync = promisify(exec)

/**
 * Captures the state of a draft container using `docker commit` and pushes it to the cloud registry.
 * This preserves the creator's workspace as a runnable image for solvers.
 *
 * Ops: the registry host must be listed under Docker Engine `insecure-registries` if it uses HTTP
 * (e.g. `"insecure-registries": ["150.136.116.136:5000"]`). Large desktop-base images can take
 * many minutes to commit and push; progress appears as `docker push` layer lines in the build log.
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
    appendLog(
      buildId,
      `Capturing container filesystem (docker commit). This can take several minutes for large images…`,
      true
    )

    const localSnapshotTag = `local-capture-${postId}`
    // Explicitly preserve ENTRYPOINT, USER, and other metadata during commit
    const commitCmd = `docker commit \\
      --change='ENTRYPOINT ["/entrypoint.sh"]' \\
      --change='USER developer' \\
      --change='EXPOSE 3000' \\
      --change='WORKDIR /workspace' \\
      ${containerId} ${localSnapshotTag}`
    
    await execAsync(commitCmd, {
      maxBuffer: 50 * 1024 * 1024,
    })
    appendLog(buildId, `Workspace snapshot captured successfully.`)

    appendLog(buildId, `Tagging image for registry…`, true)
    await execAsync(`docker tag ${localSnapshotTag} ${imageName}`)

    // `docker push` gives steadier progress than buildx for a pre-built image; buildx was also fed
    // an invalid `--output registry.insecure=true` (not a valid type=… spec), which could confuse BuildKit.
    appendLog(
      buildId,
      `Pushing to registry (copying layers / blobs — often looks “stuck” during multi‑GB uploads; wait for completion)…`,
      true
    )

    await new Promise<void>((resolve, reject) => {
      const child = spawn('docker', ['push', imageName])

      const forward = (chunk: Buffer, prefix: string) => {
        const text = chunk.toString()
        for (const line of text.split(/\r?\n/)) {
          const msg = line.trim()
          if (msg) appendLog(buildId, `${prefix}${msg}`)
        }
      }

      child.stdout.on('data', (data) => forward(data, '[push] '))
      child.stderr.on('data', (data) => forward(data, '[push] '))

      child.on('error', (err) => reject(err))
      child.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`Registry push failed with exit code ${code}.`))
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
