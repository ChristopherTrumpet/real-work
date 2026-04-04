'use server'

import { exec } from 'child_process'
import { promisify } from 'util'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

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

  if (!containerId || !title) {
    redirect('/error?message=' + encodeURIComponent('Missing required fields'))
  }

  const imageName = `user-${user.id.substring(0,8).toLowerCase()}-${Date.now()}`

  try {
    // 1. Determine the working directory (volume) to extract
    let workdir = '/config'
    try {
      const { stdout: inspectStdout } = await execAsync(`docker inspect --format="{{.Config.WorkingDir}}" ${containerId}`)
      const trimmedWorkdir = inspectStdout.trim().replace(/^['"]|['"]$/g, '')
      if (trimmedWorkdir && trimmedWorkdir !== '/') {
        workdir = trimmedWorkdir
      } else {
        const { stdout: volStdout } = await execAsync(`docker inspect --format="{{json .Config.Volumes}}" ${containerId}`)
        const volumes = JSON.parse(volStdout)
        const volKeys = Object.keys(volumes)
        if (volKeys.length > 0) {
          workdir = volKeys.includes('/config') ? '/config' : volKeys[0]
        }
      }
    } catch(e) {}

    // 2. Setup a temporary build context
    const tmpBuildDir = path.join(process.cwd(), 'tmp_build', containerId)
    fs.mkdirSync(tmpBuildDir, { recursive: true })

    // 3. Extract the volume contents from the running studio container
    // We rename the extracted folder to 'workspace_data' locally to avoid naming collisions
    await execAsync(`docker cp ${containerId}:${workdir} "${path.join(tmpBuildDir, 'workspace_data')}"`)

    // 4. Commit the base container (captures changes outside the volume)
    const baseImageName = `${imageName}-base`
    await execAsync(`docker commit ${containerId} ${baseImageName}`)

    // 5. Create a Dockerfile to bake the extracted volume back into the final image
    const dockerfileContent = `
FROM ${baseImageName}
# Copy the extracted volume data back into the container's working directory
COPY workspace_data ${workdir}
# Ensure permissions are correct
USER root
RUN chmod -R 777 ${workdir} || true
`
    fs.writeFileSync(path.join(tmpBuildDir, 'Dockerfile'), dockerfileContent)

    // 6. Build the final image
    await execAsync(`docker build -t ${imageName} "${tmpBuildDir}"`)

    // 7. Clean up everything
    await execAsync(`docker stop ${containerId}`)
    await execAsync(`docker rm ${containerId}`)
    await execAsync(`docker rmi ${baseImageName}`)
    fs.rmSync(tmpBuildDir, { recursive: true, force: true })

  } catch (error: any) {
    console.error('Docker commit error:', error)
    redirect('/error?message=' + encodeURIComponent('Failed to save container image: ' + (error.stderr || error.message)))
  }

  // Format description to include difficulty
  const fullDescription = `[Difficulty: ${difficulty.toUpperCase()}]\n\n${description}`

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    title,
    description: fullDescription,
    content_url: imageName
  })

  if (error) {
    redirect('/error?message=' + encodeURIComponent(error.message))
  }

  redirect('/')
}

