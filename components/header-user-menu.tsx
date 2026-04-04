'use client'

import Link from 'next/link'
import { DropdownMenu } from 'radix-ui'
import { ThemeToggle } from '@/components/theme-toggle'
import { avatarInitials } from '@/lib/avatar-initials'
import { cn } from '@/lib/utils'

type HeaderUserMenuProps = {
  email: string
  avatarUrl: string | null
  fullName: string | null
  username: string | null
}

export function HeaderUserMenu({ email, avatarUrl, fullName, username }: HeaderUserMenuProps) {
  const initials = avatarInitials(fullName, username, email)

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full',
            'border border-border bg-muted ring-offset-background transition hover:ring-2 hover:ring-ring/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label="Account menu"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied URL; avoids remotePatterns for every host
            <img src={avatarUrl} alt="" className="size-9 object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">{initials}</span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className={cn(
            'z-50 min-w-[14rem] overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md'
          )}
        >
          <form id="header-signout-form" action="/auth/signout" method="post" hidden />
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm">
            <span className="text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className="block cursor-pointer rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted"
            >
              Profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <button
              type="submit"
              form="header-signout-form"
              className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10"
            >
              Sign out
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
