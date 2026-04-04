'use server'

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { createClient } from '@/utils/supabase/server'

const execAsync = promisify(exec)

export async function buildChallengeContainer(config: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { repoUrl, templateId, benchmarkLang, goldCode, details } = config

  const imageName = `challenge-${user.id.substring(0,8).toLowerCase()}-${Date.now()}`
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'builder-'))

  try {
    // 1. Determine Base Image & Kasm Configuration
    // We use Kasm-based images for VS Code and Desktop support
    let baseImage = 'kasmweb/vs-code:1.15.0'
    let workspaceDir = '/home/kasm-user/workspace'
    let setupCommands = []

    if (templateId === 'linux') {
      baseImage = 'kasmweb/core-ubuntu-full:1.15.0'
      workspaceDir = '/home/kasm-user/Desktop/challenge'
    }

    // 2. Prepare Environment setup commands
    if (benchmarkLang === 'python') {
      setupCommands.push('sudo apt-get update && sudo apt-get install -y python3 python3-pip')
    } else if (benchmarkLang === 'typescript' || templateId === 'node') {
      setupCommands.push('curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs')
    } else if (benchmarkLang === 'rust') {
      setupCommands.push('curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y')
    }

    // 3. Generate Dockerfile
    let browserScriptPath = ''
    if (templateId === 'node') {
      const scriptContent = `#!/bin/bash
while ! curl -s http://localhost:3000 > /dev/null; do sleep 2; done
firefox http://localhost:3000 &
`
      await fs.writeFile(path.join(tmpDir, 'start_browser.sh'), scriptContent)
    }

    const dockerfileContent = `
FROM ${baseImage}
USER root

# Install dependencies
RUN apt-get update && apt-get install -y git curl firefox

# Prepare workspace
RUN mkdir -p /home/kasm-user/project && chown -R kasm-user:kasm-user /home/kasm-user/project
WORKDIR /home/kasm-user/project

# Clone repo as kasm-user to avoid permission issues
USER kasm-user
RUN git clone ${repoUrl} . || echo "Clone failed"

# Back to root for environment setup
USER root
${setupCommands.map(cmd => `RUN ${cmd}`).join('\n')}

# Configure VS Code to open the project directory automatically
RUN mkdir -p /home/kasm-user/.config/Code/User && \
    echo '{"workbench.startupEditor": "none", "terminal.integrated.cwd": "/home/kasm-user/project"}' > /home/kasm-user/.config/Code/User/settings.json && \
    chown -R kasm-user:kasm-user /home/kasm-user/.config

# If web template, inject auto-start browser script into Kasm's startup flow
${templateId === 'node' ? `
COPY start_browser.sh /dockerstartup/start_browser.sh
RUN chmod +x /dockerstartup/start_browser.sh && chown kasm-user:kasm-user /dockerstartup/start_browser.sh
` : ''}

USER kasm-user
WORKDIR /home/kasm-user/project
`
    await fs.writeFile(path.join(tmpDir, 'Dockerfile'), dockerfileContent)

    // 4. Build the Docker image
    await execAsync(`docker build -t ${imageName} "${tmpDir}"`)

    // 5. Spin up the container
    // Kasm images use 6901 for VNC/HTTPS access
    const internalPort = '6901'
    const runCmd = `docker run -d --shm-size="1gb" -p 6901 -e VNC_PW=password ${imageName}`
    const { stdout: runStdout } = await execAsync(runCmd)
    const containerId = runStdout.trim()

    // Give it a moment to start and publish the port
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Check if container is still running
    const { stdout: statusStdout } = await execAsync(`docker inspect --format='{{.State.Running}}' ${containerId}`)
    if (statusStdout.trim() !== 'true') {
      const { stderr: logsStderr, stdout: logsStdout } = await execAsync(`docker logs ${containerId}`)
      throw new Error(`Container crashed immediately after start. Logs: ${logsStderr || logsStdout}`)
    }

    // 6. Get assigned port using docker inspect (more reliable than docker port)
    let hostPort = ''
    try {
      const inspectCmd = `docker inspect --format='{{(index (index .NetworkSettings.Ports "${internalPort}/tcp") 0).HostPort}}' ${containerId}`
      const { stdout: pStdout } = await execAsync(inspectCmd)
      hostPort = pStdout.trim()
    } catch (e) {
      throw new Error('Failed to retrieve host port mapping. Ensure the container is listening on 6901.')
    }
    
    if (!hostPort) throw new Error('Could not determine assigned host port')

    // 7. Save to DB
    const { data: postData, error } = await supabase.from('posts').insert({
      user_id: user.id,
      title: details.title,
      description: details.description,
      difficulty: details.difficulty,
      tags: details.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
      content_url: imageName,
      benchmark_language: benchmarkLang,
      benchmark_gold_code: goldCode,
      benchmark_test_cases: JSON.parse(details.testCases || '[]'),
      benchmark_timeout_ms: parseInt(details.timeout || '10000'),
      is_draft: true // Mark as draft until published
    }).select().single()

    if (error) throw new Error('Database insert failed: ' + error.message)

    return { 
      success: true, 
      port: hostPort, 
      containerId, 
      postId: postData.id 
    }

  } catch (error: any) {
    console.error('Builder Error:', error)
    return { success: false, error: error.message || String(error) }
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
    } catch (e) {}
  }
}
