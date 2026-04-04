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
  let workdir = '/app'
  
  try {
    // 1. Handle persistent session if logged in
    if (userId && postId) {
      const localPath = path.join(process.cwd(), 'container_data', userId, postId)
      
      // If user wants to start over, delete the existing local folder
      if (actionType === 'restart') {
        fs.rmSync(localPath, { recursive: true, force: true })
      }

      // Determine the container's working directory
      try {
        const { stdout: inspectStdout } = await execAsync(`docker inspect --format="{{.Config.WorkingDir}}" ${image}`)
        const trimmedWorkdir = inspectStdout.trim().replace(/^['"]|['"]$/g, '')
        if (trimmedWorkdir && trimmedWorkdir !== '/') {
          workdir = trimmedWorkdir
        }
      } catch(e) {
        console.warn('Could not inspect image for workdir, defaulting to /app')
      }

      // If the local folder doesn't exist, create it and extract initial files
      if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, { recursive: true })
        try {
          const { stdout: createStdout } = await execAsync(`docker create ${image}`)
          const tmpId = createStdout.trim()
          
          // Copy initial files from the image to the local folder
          // Using /. ensures we copy the contents, not the directory itself
          await execAsync(`docker cp ${tmpId}:${workdir}/. "${localPath}/"`)
          await execAsync(`docker rm -v ${tmpId}`)
        } catch (e) {
          console.error('Failed to extract initial files from image:', e)
        }
      }
      
      volumeMount = `-v "${localPath}:${workdir}"`
    }

    // 2. Start the container
    const runCmd = `docker run -d --shm-size="1gb" -p 0:${internalPort} ${volumeMount} ${image}`
    const { stdout: runStdout } = await execAsync(runCmd)
    const containerId = runStdout.trim()

    // 3. Fix permissions
    try {
      const chmodCmd = `docker exec -u root ${containerId} chmod -R 777 ${workdir}`
      await execAsync(chmodCmd)
    } catch (permError) {
      console.warn('Failed to update container permissions:', permError)
    }

    // 4. Get assigned port
    const portCmd = `docker port ${containerId} ${internalPort}`
    const { stdout: portStdout } = await execAsync(portCmd)
    
    const match = portStdout.match(/:(\d+)/)
    if (!match) throw new Error('Could not determine assigned host port from Docker')
    hostPort = match[1]
  } catch (error: any) {
    console.error('Docker Error:', error)
    redirect('/error?message=' + encodeURIComponent('Docker deployment failed: ' + (error.stderr || error.message)))
  }

  redirect(`/preview?port=${hostPort}`)
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
