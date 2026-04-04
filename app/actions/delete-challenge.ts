'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function deleteChallenge(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // 1. Fetch the post to check ownership and get imageName
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('user_id, content_url')
    .eq('id', postId)
    .single()

  if (fetchError || !post) {
    throw new Error('Challenge not found')
  }

  if (post.user_id !== user.id) {
    throw new Error('Unauthorized to delete this challenge')
  }

  // 2. Delete from database
  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (deleteError) {
    throw new Error('Failed to delete challenge from database: ' + deleteError.message)
  }

  // 3. Attempt to cleanup docker resources (Optional/Background)
  // We try to remove the image if it's no longer needed.
  try {
    const imageName = post.content_url
    if (imageName && imageName.startsWith('challenge-')) {
      // Find and stop any running containers using this image
      const { stdout: containerIds } = await execAsync(`docker ps -a --filter "ancestor=${imageName}" --format "{{.ID}}"`)
      if (containerIds.trim()) {
        const ids = containerIds.trim().split('\n')
        for (const id of ids) {
          await execAsync(`docker stop ${id} && docker rm ${id}`)
        }
      }
      // Remove the image
      await execAsync(`docker rmi ${imageName}`)
    }
  } catch (dockerError) {
    console.error('Docker cleanup error during deletion:', dockerError)
    // We don't fail the whole request if docker cleanup fails
  }

  revalidatePath('/')
  redirect('/')
}
