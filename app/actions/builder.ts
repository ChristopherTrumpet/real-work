'use server'

import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { createClient } from '@/utils/supabase/server'
import { initBuild, appendLog, finishBuild, failBuild } from '@/lib/build-logs'

const execAsync = promisify(exec)

export async function buildChallengeContainer(config: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { repoUrl, templateId, benchmarkLang, goldCode, details } = config
  const buildId = `build-${Date.now()}`
  const imageName = `challenge-${user.id.substring(0,8).toLowerCase()}-${Date.now()}`
  
  initBuild(buildId)
  
  // Run build process in background
  runBuildProcess(buildId, imageName, config, user.id)

  return { success: true, buildId }
}

async function runBuildProcess(buildId: string, imageName: string, config: any, userId: string) {
  const { repoUrl, templateId, benchmarkLang, goldCode, details } = config
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'builder-'))
  const supabase = await createClient()
  const arch = os.arch() === 'arm64' ? 'arm64' : 'amd64'

  try {
    appendLog(buildId, `Generating project environment...`, true)
    
    let setupCommands = []
    if (benchmarkLang === 'python') {
      setupCommands.push('apt-get install -y --no-install-recommends python3 python3-pip')
    } else if (templateId === 'node' || benchmarkLang === 'typescript' || benchmarkLang === 'javascript') {
      setupCommands.push('curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y --no-install-recommends nodejs')
    } else if (benchmarkLang === 'rust') {
      setupCommands.push('curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y')
    } else if (benchmarkLang === 'java') {
      setupCommands.push('apt-get install -y --no-install-recommends openjdk-17-jdk')
    }

    // Generate startup script
    const startupScript = `#!/bin/bash
export DISPLAY=:1
export HOME=/root
mkdir -p /root/.vnc
echo "password" | vncpasswd -f > /root/.vnc/passwd
chmod 600 /root/.vnc/passwd

# Clean up old locks
vncserver -kill :1 || true
rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1

# Start VNC server
vncserver :1 -geometry 1280x800 -depth 24

# Start Window Manager
startxfce4 &

# Wait for X
sleep 3

# Launch VS Code with the project folder
code --no-sandbox --user-data-dir /root/.vscode-data /root/project &

# Launch Firefox
firefox &

# Start noVNC proxy
/usr/share/novnc/utils/novnc_proxy --vnc localhost:5901 --listen 6080
`
    await fs.writeFile(path.join(tmpDir, 'entrypoint.sh'), startupScript)

    const dockerfileContent = `
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV HOME=/root

# Install essential desktop components and Firefox PPA requirements
RUN apt-get update && apt-get install -y --no-install-recommends \\
    xfce4 xfce4-panel xfce4-session xfwm4 xfce4-terminal \\
    tightvncserver \\
    novnc websockify \\
    curl git wget ca-certificates \\
    dbus-x11 x11-xserver-utils \\
    software-properties-common gpg-agent \\
    && add-apt-repository -y ppa:mozillateam/ppa \\
    && echo 'Package: *\\nPin: release o=LP-PPA-mozillateam\\nPin-Priority: 1001' > /etc/apt/preferences.d/mozilla-firefox \\
    && apt-get update && apt-get install -y --no-install-recommends firefox \\
    && rm -rf /var/lib/apt/lists/*

# Install VS Code
RUN wget -q -O code.deb https://update.code.visualstudio.com/latest/linux-deb-${arch === 'arm64' ? 'arm64' : 'x64'}/stable \\
    && apt-get update && apt-get install -y ./code.deb \\
    && rm code.deb && rm -rf /var/lib/apt/lists/*

# Language specific setup
${setupCommands.map(cmd => `RUN apt-get update && ${cmd} && rm -rf /var/lib/apt/lists/*`).join('\n')}

# Clone repo
WORKDIR /root/project
RUN git clone ${repoUrl} . || echo "Clone failed"

# Setup entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose noVNC port
EXPOSE 6080

ENTRYPOINT ["/entrypoint.sh"]
`
    await fs.writeFile(path.join(tmpDir, 'Dockerfile'), dockerfileContent)

    // 3. Export configuration
    appendLog(buildId, `Exporting local configuration...`, true)
    const exportDir = path.join(process.cwd(), 'challenges', imageName)
    await fs.mkdir(exportDir, { recursive: true })
    const files = await fs.readdir(tmpDir)
    for (const file of files) {
      await fs.copyFile(path.join(tmpDir, file), path.join(exportDir, file))
    }

    // 4. Build Docker image
    appendLog(buildId, `Executing docker build -t ${imageName}...`, true)
    
    await new Promise((resolve, reject) => {
      const child = spawn('docker', ['build', '-t', imageName, tmpDir])
      
      child.stdout.on('data', (data) => {
        const line = data.toString().trim()
        if (line) appendLog(buildId, line)
      })
      child.stderr.on('data', (data) => {
        const line = data.toString().trim()
        if (line) appendLog(buildId, `[build-stderr] ${line}`)
      })
      
      child.on('close', (code) => {
        if (code === 0) resolve(true)
        else reject(new Error(`Docker build failed with code ${code}`))
      })
    })

    appendLog(buildId, `Image built successfully: ${imageName}`)

    // 5. Spin up container
    appendLog(buildId, `Provisioning live workspace...`, true)
    const internalPort = '6080'
    const runCmd = `docker run -d --shm-size="1gb" -p ${internalPort} ${imageName}`
    const { stdout: runStdout } = await execAsync(runCmd)
    const containerId = runStdout.trim()

    await new Promise(resolve => setTimeout(resolve, 5000))

    // Check health
    const { stdout: statusStdout } = await execAsync(`docker inspect --format='{{.State.Running}}' ${containerId}`)
    if (statusStdout.trim() !== 'true') {
      const { stderr: logsStderr, stdout: logsStdout } = await execAsync(`docker logs ${containerId}`)
      throw new Error(`Workspace container failed to start. Logs: ${logsStderr || logsStdout}`)
    }

    // 6. Get assigned port
    let hostPort = ''
    try {
      const inspectCmd = `docker inspect --format='{{(index (index .NetworkSettings.Ports "${internalPort}/tcp") 0).HostPort}}' ${containerId}`
      const { stdout: pStdout } = await execAsync(inspectCmd)
      hostPort = pStdout.trim()
    } catch (e) {
      throw new Error('Failed to retrieve host port mapping.')
    }
    
    // 7. Save to DB
    appendLog(buildId, `Finalizing database records...`, true)
    const { data: postData, error } = await supabase.from('posts').insert({
      user_id: userId,
      title: details.title,
      description: details.description,
      difficulty: details.difficulty,
      tags: details.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
      content_url: imageName,
      benchmark_language: benchmarkLang,
      benchmark_gold_code: goldCode,
      benchmark_test_cases: JSON.parse(details.testCases || '[]'),
      benchmark_timeout_ms: parseInt(details.timeout || '10000'),
      is_draft: true
    }).select().single()

    if (error) throw new Error('Database insert failed: ' + error.message)

    finishBuild(buildId, { 
      port: hostPort, 
      containerId, 
      postId: postData.id 
    })

  } catch (error: any) {
    console.error('Builder Error:', error)
    failBuild(buildId, error.message || String(error))
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
    } catch (e) {}
  }
}
