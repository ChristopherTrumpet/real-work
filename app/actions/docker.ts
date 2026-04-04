'use server'

import { exec } from 'child_process'
import { promisify } from 'util'
import { redirect } from 'next/navigation'
import net from 'net'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export async function isContainerReady(port: number): Promise<boolean> {
// ... existing isContainerReady code ...
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const onError = () => {
      socket.destroy()
      resolve(false)
    }

    socket.setTimeout(1000)
    socket.on('error', onError)
    socket.on('timeout', onError)

    socket.connect(port, 'localhost', () => {
      socket.destroy()
      resolve(true)
    })
  })
}

export async function deployContainer(formData: FormData) {
  const image = formData.get('image') as string
  const postId = formData.get('postId') as string
  const userId = formData.get('userId') as string
  const actionType = formData.get('actionType') as string || 'launch'
  const internalPort = '3000'

  if (!image) {
    redirect('/error?message=' + encodeURIComponent('Docker image name/URL is required'))
  }

  let hostPort = ''
  let volumeMount = ''
  let workdir = '/config' // Default to /config for these types of images
  
  try {
    // 1. Determine the correct working directory for the image (for all users)
    try {
      const { stdout: inspectStdout } = await execAsync(`docker inspect --format="{{.Config.WorkingDir}}" ${image}`)
      const trimmedWorkdir = inspectStdout.trim().replace(/^['"]|['"]$/g, '')
      
      if (trimmedWorkdir && trimmedWorkdir !== '/') {
        workdir = trimmedWorkdir
      } else {
        // Fallback to checking for a defined Volume if WorkingDir isn't useful
        const { stdout: volStdout } = await execAsync(`docker inspect --format="{{json .Config.Volumes}}" ${image}`)
        const volumes = JSON.parse(volStdout)
        const volKeys = Object.keys(volumes)
        if (volKeys.length > 0) {
          // Prefer /config if it exists, otherwise take the first one
          workdir = volKeys.includes('/config') ? '/config' : volKeys[0]
        }
      }
    } catch(e) {
      console.warn('Could not inspect image, defaulting workdir to /config.')
    }

    // 2. Handle persistent session ONLY if logged in
    if (userId && postId) {
      const localPath = path.join(process.cwd(), 'container_data', userId, postId)
      
      if (actionType === 'restart') {
        fs.rmSync(localPath, { recursive: true, force: true })
      }

      if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, { recursive: true })
        try {
          const { stdout: createStdout } = await execAsync(`docker create ${image}`)
          const tmpId = createStdout.trim()
          await execAsync(`docker cp ${tmpId}:${workdir}/. "${localPath}/"`)
          await execAsync(`docker rm -v ${tmpId}`)
        } catch (e) {
          console.error('Failed to extract initial files from image:', e)
        }
      }
      
      volumeMount = `-v "${localPath}:${workdir}"`
    }

    // 3. Start the container
    const runCmd = `docker run -d --shm-size="1gb" -p 0:${internalPort} ${volumeMount} ${image}`
    const { stdout: runStdout } = await execAsync(runCmd)
    const containerId = runStdout.trim()

    // 4. Fix permissions for the determined workdir (for all users)
    let permSuccess = false;
    for (let i = 0; i < 5; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const chmodCmd = `docker exec -u root ${containerId} chmod -R 777 ${workdir}`
        await execAsync(chmodCmd)
        permSuccess = true;
        break; 
      } catch (permError: any) {
        console.warn(`Attempt ${i + 1} to fix permissions failed:`, permError.message || permError)
      }
    }
    
    if (!permSuccess) {
      console.error('Failed to update container permissions after multiple attempts.')
    }

    // 5. Get assigned port
    const portCmd = `docker port ${containerId} ${internalPort}`
    const { stdout: portStdout } = await execAsync(portCmd)
    
    const match = portStdout.match(/:(\d+)/)
    if (!match) throw new Error('Could not determine assigned host port from Docker')
    hostPort = match[1]
  } catch (error: any) {
    console.error('Docker Error:', error)
    redirect('/error?message=' + encodeURIComponent('Docker deployment failed: ' + (error.stderr || error.message)))
  }

  if (postId) {
    redirect(`/preview?port=${hostPort}&postId=${postId}`)
  } else {
    redirect(`/preview?port=${hostPort}`)
  }
}

export async function killContainer(port: number): Promise<{ success: boolean; message: string }> {
  if (!port) {
    return { success: false, message: 'Port not provided.' }
  }

  try {
    // Find the container ID using the port
    const findCmd = `docker ps --filter "publish=${port}" --format "{{.ID}}"`
    const { stdout: containerId } = await execAsync(findCmd)

    if (!containerId) {
      return { success: false, message: `No container found on port ${port}.` }
    }

    const trimmedId = containerId.trim()
    // Stop and remove the container
    const stopCmd = `docker stop ${trimmedId}`
    await execAsync(stopCmd)
    
    const rmCmd = `docker rm ${trimmedId}`
    await execAsync(rmCmd)

    return { success: true, message: `Container ${trimmedId} on port ${port} has been stopped and removed.` }
  } catch (error: any) {
    console.error('Docker Kill Error:', error)
    return { success: false, message: error.stderr || error.message }
  }
}
