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
  const registry = '150.136.116.136:5000'
  const baseImageName = `challenge-${user.id.substring(0,8).toLowerCase()}-${Date.now()}`
  const imageName = `${registry}/${baseImageName}`
  
  initBuild(buildId)
  
  // Run build process in background
  runBuildProcess(buildId, imageName, config, user.id)

  return { success: true, buildId }
}

async function runBuildProcess(buildId: string, imageName: string, config: any, userId: string) {
  const { repoUrl, templateId, benchmarkLang, goldCode, details } = config
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'builder-'))
  const supabase = await createClient()

  try {
    appendLog(buildId, `Generating high-performance workspace...`, true)
    
    // 1. Language-specific setup commands
    let setupCommands = []
    let extraApt = []
    
    if (benchmarkLang === 'python') {
      extraApt.push('python3', 'python3-pip')
    } else if (templateId === 'node' || benchmarkLang === 'typescript' || benchmarkLang === 'javascript') {
      setupCommands.push('curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs')
    } else if (benchmarkLang === 'rust') {
      setupCommands.push('curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y')
    } else if (benchmarkLang === 'java') {
      extraApt.push('openjdk-17-jdk')
    }

    // 2. Generate scripts and Dockerfile using WebTop base
    if (templateId === 'node' || templateId === 'static') {
      const scriptContent = `#!/bin/bash
# Wait for the web server to be ready (port 3000 for node, port 8080 for static/python simple server)
TARGET_PORT=${templateId === 'node' ? '3000' : '8080'}
while ! curl -s http://localhost:$TARGET_PORT > /dev/null; do
  sleep 2
done
firefox http://localhost:$TARGET_PORT &
`
      await fs.writeFile(path.join(tmpDir, 'start_browser.sh'), scriptContent)
    }

    const dockerfileContent = `
FROM lscr.io/linuxserver/webtop:ubuntu-xfce

ENV DEBIAN_FRONTEND=noninteractive

# Install common tools and VS Code
RUN apt-get update && apt-get install -y \\
    git curl wget gpg sudo \\
    ${extraApt.join(' ')} \\
    && ARCH=$(dpkg --print-architecture) \\
    && if [ "$ARCH" = "arm64" ]; then VSCODE_ARCH="linux-deb-arm64"; else VSCODE_ARCH="linux-deb-x64"; fi \\
    && wget -qO vscode.deb "https://code.visualstudio.com/sha/download?build=stable&os=\${VSCODE_ARCH}" \\
    && apt-get install -y ./vscode.deb \\
    && rm vscode.deb \\
    && rm -rf /var/lib/apt/lists/*

# Template specific setup
${setupCommands.map(cmd => `RUN ${cmd}`).join('\n')}

# Clone repo into /workspace (Avoiding /config volume issues)
WORKDIR /workspace
RUN git clone ${repoUrl} . || echo "Clone failed"
RUN chown -R abc:abc /workspace

# Setup Autostart for VS Code and Firefox
RUN mkdir -p /etc/xdg/autostart && \\
    echo "[Desktop Entry]\\n\\
Type=Application\\n\\
Name=VS Code\\n\\
Exec=code /workspace --no-sandbox --disable-gpu\\n\\
Terminal=false" > /etc/xdg/autostart/vscode.desktop && \\
    echo "[Desktop Entry]\\n\\
Type=Application\\n\\
Name=Firefox\\n\\
Exec=bash /dockerstartup/start_browser.sh\\n\\
Terminal=false" > /etc/xdg/autostart/firefox.desktop

${(templateId === 'node' || templateId === 'static') ? `
COPY start_browser.sh /dockerstartup/start_browser.sh
RUN chmod +x /dockerstartup/start_browser.sh
` : ''}

${templateId === 'static' ? `
RUN echo '#!/bin/bash\\n\
cd /workspace && python3 -m http.server 8080 &\\n' > /dockerstartup/run_server.sh && \\
chmod +x /dockerstartup/run_server.sh
` : ''}

# Final permission ensure
RUN chown -R abc:abc /workspace && chmod -R 777 /workspace
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

    // 4. Build and Push Multi-platform Docker image
    appendLog(buildId, `Executing multi-platform build (amd64, arm64) and pushing to registry...`, true)
    
    await new Promise((resolve, reject) => {
      // Use buildx for multi-platform support. 
      // We use --push to send all platforms to the registry in one go.
      const child = spawn('docker', [
        'buildx', 'build', 
        '--platform', 'linux/amd64,linux/arm64', 
        '-t', imageName, 
        '--push', 
        tmpDir
      ])
      
      child.stdout.on('data', (data) => appendLog(buildId, data.toString().trim()))
      child.stderr.on('data', (data) => appendLog(buildId, `[build] ${data.toString().trim()}`))
      
      child.on('close', (code) => {
        if (code === 0) resolve(true)
        else reject(new Error(`Multi-platform build failed with code ${code}`))
      })
    })

    appendLog(buildId, `Multi-platform image pushed successfully: ${imageName}`)

    // 5. Pull local version and spin up container
    appendLog(buildId, `Provisioning live workspace (pulling current platform)...`, true)
    
    // Since buildx pushed directly to registry, we pull the current platform version to run it locally
    await execAsync(`docker pull ${imageName}`)

    const internalPort = '3000'
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
    
    appendLog(buildId, `Container ready on port ${hostPort}`)

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
