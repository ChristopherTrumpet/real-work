import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

/**
 * Record a challenge completion for the authenticated user.
 *
 * curl example (replace URL, token, and post UUID):
 *
 * ```bash
 * curl -sS -X POST "http://localhost:3000/api/completion" \
 *   -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{"postId":"00000000-0000-0000-0000-000000000000"}'
 * ```
 *
 * The access token is the same JWT from `supabase.auth.getSession()` (or the
 * `access_token` field after password / OAuth sign-in). RLS requires the token
 * subject to match the row’s `user_id`.
 */

function supabaseForRequest(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    }
  )
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token =
    authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (!token) {
    return NextResponse.json(
      {
        error:
          'Missing Authorization header. Use: Authorization: Bearer <supabase_access_token>',
      },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const postId =
    typeof body === 'object' &&
    body !== null &&
    'postId' in body &&
    typeof (body as { postId: unknown }).postId === 'string'
      ? (body as { postId: string }).postId.trim()
      : null

  if (!postId) {
    return NextResponse.json(
      { error: 'Body must include a string postId' },
      { status: 400 }
    )
  }

  const supabase = supabaseForRequest(token)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Invalid or expired access token' },
      { status: 401 }
    )
  }

  const { error } = await supabase.from('user_completions').insert({
    user_id: user.id,
    post_id: postId,
  })

  if (error) {
    if (error.code === '23505') {
      revalidatePath('/preview')
      revalidatePath('/studio')
      revalidatePath('/')
      revalidatePath(`/challenge/${postId}`)
      revalidatePath(`/challenge/${postId}/complete`)
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
      })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  revalidatePath('/preview')
  revalidatePath('/studio')
  revalidatePath('/')
  revalidatePath(`/challenge/${postId}`)
  revalidatePath(`/challenge/${postId}/complete`)

  return NextResponse.json({ success: true })
}
