import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Sign-out must attach cookie updates to the returned NextResponse.
 * Using cookies().set() via @/utils/supabase/server in a Route Handler often
 * does not persist (and may be swallowed by try/catch), so the session never clears.
 */
export async function POST(request: NextRequest) {
  const url = new URL('/', request.url)
  const response = NextResponse.redirect(url, { status: 302 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')
  revalidatePath('/profile')

  return response
}
