import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ThemeToggle } from '@/components/theme-toggle'
import { HeaderUserMenu } from '@/components/header-user-menu'
import { HeaderMaxWidthContainer } from '@/components/header-max-width-container'

export async function SiteHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('avatar_url, full_name, username')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <HeaderMaxWidthContainer>
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className="shrink-0 font-mono text-lg font-bold tracking-tight text-foreground"
          >
            real_work
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/search"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Search"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Link>
          {user ? (
            <HeaderUserMenu
              email={user.email ?? ''}
              avatarUrl={profile?.avatar_url ?? null}
              fullName={profile?.full_name ?? null}
              username={profile?.username ?? null}
            />
          ) : (
            <>
              <ThemeToggle />
              <Link
                href="/login"
                className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </HeaderMaxWidthContainer>
    </header>
  )
}
