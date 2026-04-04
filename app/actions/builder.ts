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
    // 1. Generate Dockerfile based on template
    let baseImage = 'ubuntu:latest'
    let installCmd = 'apt-get update && apt-get install -y git python3 python3-pip'
    
    if (templateId === 'node') {
      baseImage = 'node:18-bullseye'
    } else if (templateId === 'python') {
      baseImage = 'python:3.10-slim'
      installCmd = 'apt-get update && apt-get install -y git gcc g++'
    } else if (templateId === 'c' || templateId === 'rust') {
      baseImage = 'rust:latest'
      installCmd = 'apt-get update && apt-get install -y git python3 python3-pip'
    } else if (templateId === 'java') {
      baseImage = 'openjdk:17-slim'
      installCmd = 'apt-get update && apt-get install -y git python3 python3-pip'
    }

    const dockerfileContent = `
FROM ${baseImage}
ENV DEBIAN_FRONTEND=noninteractive
RUN ${installCmd}
WORKDIR /config
RUN git clone ${repoUrl} . || echo "Clone failed, continuing empty"
RUN chmod -R 777 /config || true
CMD ["sleep", "infinity"]
`
    await fs.writeFile(path.join(tmpDir, 'Dockerfile'), dockerfileContent)

    // 2. Build the Docker image
    await execAsync(`docker build -t ${imageName} "${tmpDir}"`)

    // 3. Spin up the container
    const internalPort = '3000' // Using 3000 to match the rest of the app's expectations
    const runCmd = `docker run -d --shm-size="1gb" -p 0:${internalPort} ${imageName}`
    const { stdout: runStdout } = await execAsync(runCmd)
    const containerId = runStdout.trim()

    // 4. Get assigned port
    const portCmd = `docker port ${containerId} ${internalPort}`
    const { stdout: portStdout } = await execAsync(portCmd)
    const match = portStdout.match(/:(\d+)/)
    if (!match) throw new Error('Could not determine assigned host port')
    const hostPort = match[1]

    // 5. Save to DB
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
      benchmark_timeout_ms: parseInt(details.timeout || '10000')
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
    // Cleanup temporary build dir
    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
    } catch (e) {}
  }
}
