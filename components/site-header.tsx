import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ThemeToggle } from '@/components/theme-toggle'

export async function SiteHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/"
            className="font-mono text-lg font-bold tracking-tight text-foreground shrink-0"
          >
            real_work
          </Link>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ThemeToggle />
          {user && (
            <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[140px]">
              {user.email}
            </span>
          )}
          <Link
            href="/search"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Search"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>
          {user ? (
            <Link
              href="/profile"
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Profile
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
