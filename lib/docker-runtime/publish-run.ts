import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import type { SupabaseClient } from '@supabase/supabase-js'
import { appendLog, finishBuild, failBuild } from '@/lib/build-logs'

const execAsync = promisify(exec)

export async function runPublishOnHost(
  buildId: string,
  postId: string,
  containerId: string,
  imageName: string,
  supabase: SupabaseClient
): Promise<void> {
  try {
    appendLog(
      buildId,
      `Capturing container filesystem (docker commit). This can take several minutes for large images…`,
      true
    )

    const localSnapshotTag = `local-capture-${postId}`
    await execAsync(`docker commit ${containerId} ${localSnapshotTag}`, {
      maxBuffer: 50 * 1024 * 1024,
    })
    appendLog(buildId, `Workspace snapshot captured successfully.`)

    appendLog(buildId, `Tagging image for registry…`, true)
    await execAsync(`docker tag ${localSnapshotTag} ${imageName}`)

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

    appendLog(buildId, `Updating challenge metadata...`, true)
    const { error } = await supabase
      .from('posts')
      .update({
        content_url: imageName,
        is_draft: false,
      })
      .eq('id', postId)

    if (error) throw new Error('Database update failed: ' + error.message)

    appendLog(buildId, `Cleaning up temporary resources...`, true)
    try {
      await execAsync(`docker stop ${containerId} && docker rm ${containerId}`)
      await execAsync(`docker rmi ${localSnapshotTag}`)
    } catch {
      // ignore
    }

    finishBuild(buildId, { postId })
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Publish Error:', error)
    failBuild(buildId, err.message || String(error))
  }
}
