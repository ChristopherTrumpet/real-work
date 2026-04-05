'use client'

import Link from 'next/link'
import { useRef } from 'react'
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
  const signOutFormRef = useRef<HTMLFormElement>(null)
  const initials = avatarInitials(fullName, username, email)
  const publicHandle = username?.trim() ?? ''
  const publicProfileHref = publicHandle
    ? `/u/${encodeURIComponent(publicHandle)}`
    : '/profile'

  return (
    <>
      {/* Keep outside the portaled menu: unmounting the dropdown removed the form and killed the POST. */}
      <form
        ref={signOutFormRef}
        id="header-signout-form"
        action="/auth/signout"
        method="post"
        className="hidden"
        aria-hidden
      />
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
            <div className="border-b border-border px-3 py-2.5">
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm">
              <span className="text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <DropdownMenu.Item asChild>
              <Link
                href={publicProfileHref}
                className="block cursor-pointer rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted"
              >
                <span className="block font-medium">Public profile</span>
                {!publicHandle ? (
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Choose a username in account settings to get your page
                  </span>
                ) : null}
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                href="/profile"
                className="block cursor-pointer rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted"
              >
                Account settings
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              className={cn(
                'cursor-pointer rounded-lg px-3 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10'
              )}
              onSelect={() => {
                signOutFormRef.current?.requestSubmit()
              }}
            >
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  )
}
