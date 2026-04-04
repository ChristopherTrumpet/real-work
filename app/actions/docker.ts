'use server'

import { exec } from 'child_process'
import { promisify } from 'util'
import { redirect } from 'next/navigation'
import net from 'net'

const execAsync = promisify(exec)

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
  const image = formData.get('image') as string
  const internalPort = formData.get('internalPort') as string || '80'

  if (!image) {
    redirect('/error?message=' + encodeURIComponent('Docker image name/URL is required'))
  }

  let hostPort = ''
  
  try {
    // We use -P or -p 0:port to let Docker assign a random available host port
    const runCmd = `docker run -d -p 0:${internalPort} ${image}`
    const { stdout: runStdout } = await execAsync(runCmd)
    const containerId = runStdout.trim()

    // Query Docker to find out which host port was assigned
    const portCmd = `docker port ${containerId} ${internalPort}`
    const { stdout: portStdout } = await execAsync(portCmd)
    
    // Output looks like "0.0.0.0:32768" or ":::32768"
    const match = portStdout.match(/:(\d+)/)
    if (!match) {
        throw new Error('Could not determine assigned host port from Docker')
    }
    hostPort = match[1]
  } catch (error: any) {
    console.error('Docker Error:', error)
    redirect('/error?message=' + encodeURIComponent('Docker deployment failed: ' + (error.stderr || error.message)))
  }

  // Redirect to the preview page with the new dynamic port
  redirect(`/preview?port=${hostPort}`)
}
