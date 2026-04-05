'use server'

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Background worker to sync local images with the cloud registry.
 * This ensures that when a user visits the homepage, the challenge images
 * are already present or being retrieved from the cloud.
 */
export async function syncCloudImages(imageUrls: string[]) {
  const registry = '150.136.116.136:5000'
  
  // Filter for valid cloud images
  const cloudImages = imageUrls.filter(url => url?.startsWith(registry))
  
  if (cloudImages.length === 0) return

  console.log(`Starting background sync for ${cloudImages.length} cloud images...`)

  // We run this in parallel but don't strictly await each one to block the UI
  // However, since this is a server action called from a RSC, we'll trigger them.
  for (const image of cloudImages) {
    try {
      // Check if image already exists locally to avoid redundant pulls
      const { stdout } = await execAsync(`docker images -q ${image}`)
      if (!stdout.trim()) {
        console.log(`Syncing missing cloud image: ${image}`)
        // Run pull in background (don't await)
        execAsync(`docker pull ${image}`).catch(e => console.error(`Failed to pull ${image}:`, e))
      }
    } catch (e) {
      // Ignore errors for individual images
    }
  }
}
