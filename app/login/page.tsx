'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { login, signup } from './actions'

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function LoginPage() {
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  const handleAction = async (
    formData: FormData,
    action: (fd: FormData) => Promise<{ error?: string; message?: string } | void>
  ) => {
    setIsLoading(true)
    setMessage('')

    try {
      const result = await action(formData)

      if (result && 'error' in result && result.error) {
        setMessage(result.error)
        setIsError(true)
      } else if (result && 'message' in result && typeof result.message === 'string') {
        setMessage(result.message)
        setIsError(false)
      }
    } catch {
      // redirect() from server action throws; ignore
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-8">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </Link>
        </div>

        <form className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-center text-2xl font-bold tracking-tight text-foreground">
            {isSignup ? 'Create an account' : 'Welcome back'}
          </h1>

          {message && (
            <div
              className={
                isError
                  ? 'rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive'
                  : 'rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm font-medium text-foreground'
              }
            >
              {message}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input id="password" name="password" type="password" required className={inputClass} />
          </div>

          {isSignup && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="username" className="text-sm font-medium text-foreground">
                  Username
                </label>
                <input id="username" name="username" type="text" required={isSignup} className={inputClass} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="full_name" className="text-sm font-medium text-foreground">
                  Full name
                </label>
                <input id="full_name" name="full_name" type="text" required={isSignup} className={inputClass} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="avatar_url" className="text-sm font-medium text-foreground">
                  Avatar URL
                </label>
                <input id="avatar_url" name="avatar_url" type="url" required={isSignup} className={inputClass} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="website" className="text-sm font-medium text-foreground">
                  Website
                </label>
                <input id="website" name="website" type="url" required={isSignup} className={inputClass} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="bio" className="text-sm font-medium text-foreground">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  required={isSignup}
                  className={`${inputClass} min-h-20 resize-none`}
                />
              </div>
            </>
          )}

          <div className="mt-2 flex flex-col gap-3">
            {isSignup ? (
              <button
                type="submit"
                formAction={(formData) => handleAction(formData, signup)}
                disabled={isLoading}
                className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? 'Creating account…' : 'Sign up'}
              </button>
            ) : (
              <button
                type="submit"
                formAction={(formData) => handleAction(formData, login)}
                disabled={isLoading}
                className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? 'Signing in…' : 'Sign in'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup)
                setMessage('')
                setIsError(false)
              }}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
