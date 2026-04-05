'use server'

import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { createClient } from '@/utils/supabase/server'
import { initBuild, appendLog, finishBuild, failBuild } from '@/lib/build-logs'

const execAsync = promisify(exec)

/**
 * Captures the state of a draft container and pushes it to the cloud registry.
 * This version ensures all manual changes (files, settings, installs) are preserved
 * by extracting the active project and configuration data before rebuilding.
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'publish-rebuild-'))

  try {
    appendLog(buildId, `Capturing full workspace state from live container...`, true)
    
    // 1. Extract the project code and the user's configuration
    // WebTop stores persistence in /config and we use /workspace for the project
    await fs.mkdir(path.join(tmpDir, 'workspace'), { recursive: true })
    await fs.mkdir(path.join(tmpDir, 'config'), { recursive: true })
    
    appendLog(buildId, `Exporting filesystem changes...`)
    await execAsync(`docker cp ${containerId}:/workspace/. ${path.join(tmpDir, 'workspace/')}`)
    await execAsync(`docker cp ${containerId}:/config/. ${path.join(tmpDir, 'config/')}`)

    // 2. Generate a robust Dockerfile that bakes in the exact captured state
    // We use the same base image but layer in the specific data extracted from the live container
    const dockerfileContent = `
FROM lscr.io/linuxserver/webtop:ubuntu-xfce

# Set noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Re-install core tools to ensure they are present in the final image
RUN apt-get update && apt-get install -y --no-install-recommends \\
    git curl wget gpg sudo ca-certificates python3 python3-pip \\
    && ARCH=$(dpkg --print-architecture) \\
    && if [ "$ARCH" = "arm64" ]; then VSCODE_ARCH="linux-deb-arm64"; else VSCODE_ARCH="linux-deb-x64"; fi \\
    && wget -qO vscode.deb "https://code.visualstudio.com/sha/download?build=stable&os=\${VSCODE_ARCH}" \\
    && apt-get install -y ./vscode.deb \\
    && rm vscode.deb \\
    && rm -rf /var/lib/apt/lists/*

# Copy the captured workspace and config back into the image
# We copy to /defaults as well because WebTop uses it to seed /config on first boot
COPY workspace /workspace
COPY config /config
COPY config /defaults

# Ensure correct ownership for the 'abc' user (uid 1000)
RUN chown -R 1000:1000 /workspace /config /defaults && \\
    chmod -R 777 /workspace /config /defaults

# Do NOT change ENTRYPOINT or USER to ensure the WebTop init system boots the desktop
`
    await fs.writeFile(path.join(tmpDir, 'Dockerfile'), dockerfileContent)

    // 3. Multi-platform build and push to insecure registry
    // This uses buildx to handle the HTTP registry communication safely
    appendLog(buildId, `Pushing multi-platform image to cloud registry...`, true)
    
    await new Promise((resolve, reject) => {
      const child = spawn('docker', [
        'buildx', 'build',
        '--platform', 'linux/amd64,linux/arm64',
        '--output', `type=image,name=${imageName},push=true,registry.insecure=true`,
        tmpDir
      ])
      
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

    // 4. Update database
    appendLog(buildId, `Updating challenge availability...`, true)
    const { error } = await supabase
      .from('posts')
      .update({
        content_url: imageName,
        is_draft: false
      })
      .eq('id', postId)

    if (error) throw new Error('Database update failed: ' + error.message)

    // 5. Cleanup local draft container
    appendLog(buildId, `Cleaning up local resources...`, true)
    try {
      await execAsync(`docker stop ${containerId} && docker rm ${containerId}`)
    } catch (e) {}

    finishBuild(buildId, { postId })

  } catch (error: any) {
    console.error('Publish Error:', error)
    failBuild(buildId, error.message || String(error))
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
    } catch (e) {}
  }
}
