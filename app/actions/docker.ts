'use server'

import { exec } from 'child_process'
import { promisify } from 'util'
import { redirect } from 'next/navigation'
import net from 'net'
import fs from 'fs'
import path from 'path'
import { createClient } from '@/utils/supabase/server'

import { revalidatePath } from 'next/cache'

const execAsync = promisify(exec)

export async function resetProgress(postId: string, userId: string) {
  if (!postId || !userId) return { success: false }
  
  const progressTag = `realwork-progress:${userId}-${postId}`
  try {
    await execAsync(`docker rmi -f ${progressTag}`)
  } catch {
    // Image might not exist, that's fine
  }
  
  const localPath = path.join(process.cwd(), 'container_data', userId, postId)
  if (fs.existsSync(localPath)) {
    fs.rmSync(localPath, { recursive: true, force: true })
  }
  
  revalidatePath('/')
  revalidatePath(`/challenge/${postId}`)
  return { success: true }
}

export async function isContainerReady(port: number): Promise<boolean> {
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const image = formData.get('image') as string
  const postId = formData.get('postId') as string
  const userId = (formData.get('userId') as string) || user?.id
  const actionType = formData.get('actionType') as string || 'launch'
  const internalPort = '3000'

  if (!image) {
    redirect('/error?message=' + encodeURIComponent('Docker image name/URL is required'))
  }

  const registry = '150.136.116.136:5000'
  const isCloudImage = image.startsWith(registry)

  let hostPort = ''
  let containerId = ''
  let imageToRun = image
  
  try {
    // 0. Pull image if it's a cloud image and we don't have progress
    if (isCloudImage && actionType !== 'resume') {
      console.log(`Pulling image from cloud registry: ${image}`)
      await execAsync(`docker pull ${image}`)
    }

    // 1. Check for saved progress image if resuming
    if (userId && postId && actionType !== 'restart') {
      const progressTag = `realwork-progress:${userId}-${postId}`
      try {
        await execAsync(`docker image inspect ${progressTag}`)
        imageToRun = progressTag
        console.log(`Resuming from saved progress image: ${progressTag}`)
      } catch {
        // Progress image doesn't exist, will use original image
      }
    }

    // 2. Start the container (no volume mount needed as we use commit)
    const runCmd = `docker run -d --shm-size="1gb" -p 0:${internalPort} ${imageToRun}`
    const { stdout: runStdout } = await execAsync(runCmd)
    containerId = runStdout.trim()

    // 3. Fix permissions for common workdirs (best effort)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Try common paths
      await execAsync(`docker exec -u root ${containerId} chmod -R 777 /config || true`)
      await execAsync(`docker exec -u root ${containerId} chmod -R 777 /app || true`)
      await execAsync(`docker exec -u root ${containerId} chmod -R 777 /workspace || true`)
    } catch {
      console.warn('Could not update container permissions.')
    }

    // 4. Get assigned port
    const portCmd = `docker port ${containerId} ${internalPort}`
    const { stdout: portStdout } = await execAsync(portCmd)
    
    const match = portStdout.match(/:(\d+)/)
    if (!match) throw new Error('Could not determine assigned host port from Docker')
    hostPort = match[1]
  } catch (error) {
    console.error('Docker Error:', error)
    const message = error instanceof Error ? error.message : String(error)
    redirect('/error?message=' + encodeURIComponent('Docker deployment failed: ' + message))
  }

  const portQ = encodeURIComponent(hostPort)
  const cidQ = encodeURIComponent(containerId)

  if (postId) {
    redirect(`/workspace?port=${portQ}&containerId=${cidQ}&postId=${encodeURIComponent(postId)}`)
  } else {
    redirect(`/workspace?port=${portQ}&containerId=${cidQ}`)
  }
}

export async function getContainerIdByPort(port: number): Promise<string | null> {
  if (!port) return null
  try {
    const findCmd = `docker ps --filter "publish=${port}" --format "{{.ID}}"`
    const { stdout } = await execAsync(findCmd)
    return stdout.trim() || null
  } catch (error) {
    console.error('Error getting container ID:', error)
    return null
  }
}

export async function killContainer(port: number, saveContext?: { userId: string, postId: string }): Promise<{ success: boolean; message: string }> {
  if (!port) {
    return { success: false, message: 'Port not provided.' }
  }

  try {
    // Find the container ID using the port
    const findId = await getContainerIdByPort(port)

    if (!findId) {
      return { success: false, message: `No container found on port ${port}.` }
    }

    const trimmedId = findId.trim()

    // 1. If save context provided, commit the container state to an image
    if (saveContext?.userId && saveContext?.postId) {
      const progressTag = `realwork-progress:${saveContext.userId}-${saveContext.postId}`
      console.log(`Saving container ${trimmedId} to image ${progressTag}...`)
      await execAsync(`docker commit ${trimmedId} ${progressTag}`)
    }

    // 2. Stop and remove the container
    const stopCmd = `docker stop ${trimmedId}`
    await execAsync(stopCmd)
    
    const rmCmd = `docker rm ${trimmedId}`
    await execAsync(rmCmd)

    return { success: true, message: `Container ${trimmedId} on port ${port} has been saved and removed.` }
  } catch (error) {
    console.error('Docker Kill Error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, message }
  }
}
