import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

/**
 * Writes a Docker --env-file so JWTs and IDs are not embedded in shell strings.
 * Variables match what /api/completion expects (Bearer token + JSON postId).
 */
export async function createDockerCompletionEnvFile(params: {
  accessToken: string | null | undefined
  postId: string | null | undefined
}): Promise<string | null> {
  const lines: string[] = []
  const token = params.accessToken?.trim()
  const postId = params.postId?.trim()
  if (token) {
    lines.push(`REALWORK_SUPABASE_ACCESS_TOKEN=${token}`)
  }
  if (postId) {
    lines.push(`REALWORK_POST_ID=${postId}`)
  }
  if (lines.length === 0) return null

  const filePath = path.join(
    os.tmpdir(),
    `realwork-docker-${crypto.randomBytes(12).toString('hex')}.env`
  )
  await fs.writeFile(filePath, `${lines.join('\n')}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  })
  return filePath
}

export async function deleteDockerEnvFile(filePath: string | null | undefined): Promise<void> {
  if (!filePath) return
  try {
    await fs.unlink(filePath)
  } catch {
    /* ignore */
  }
}
