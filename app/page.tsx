import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { deployContainer } from './actions/docker'
import { startStudioSession } from './actions/studio'
import { ChallengeFeedCard, type ChallengeFeedItem } from '@/components/ChallengeFeedCard'
import { HeroSection } from '@/components/home/HeroSection'
import fs from 'fs'
import path from 'path'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: containers, error: fetchError } = await supabase
    .from('posts')
    .select('*, profiles!user_id(username, full_name)')
    .order('created_at', { ascending: false })

  const list = (containers ?? []) as ChallengeFeedItem[]

  const activeSessions = new Set<string>()
  if (user && list.length) {
    list.forEach((container) => {
      const localPath = path.join(process.cwd(), 'container_data', user.id, container.id)
      if (fs.existsSync(localPath)) {
        activeSessions.add(container.id)
      }
    })
  }

  const totalChallenges = list.length
  const totalCompletions = list.reduce((acc, c) => acc + (c.number_of_completions ?? 0), 0)
  const contributorCount = new Set(list.map((c) => c.user_id as string).filter(Boolean)).size

  return (
    <div className="min-h-screen bg-background">
      <HeroSection>
        <p className="mx-auto mt-5 max-w-2xl text-center text-base leading-relaxed text-muted-foreground sm:mx-0 sm:text-left sm:text-lg">
          Browse community challenges, launch isolated workspaces, and track progress—all from one place.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
          <a
            href="#library"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Explore library
          </a>
          {user ? (
            <form action={startStudioSession} className="w-full sm:w-auto">
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-primary/40 bg-primary/5 px-6 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 sm:w-auto"
              >
                Create challenge
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-primary/40 bg-primary/5 px-6 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 sm:w-auto"
            >
              Sign in to create
            </Link>
          )}
        </div>
      </HeroSection>

      {/* Metrics */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px bg-border sm:grid-cols-3">
          <div className="bg-background px-6 py-8 text-center sm:text-left">
            <p className="text-3xl font-semibold tabular-nums text-foreground md:text-4xl">{totalChallenges}</p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Published challenges</p>
          </div>
          <div className="bg-background px-6 py-8 text-center sm:text-left">
            <p className="text-3xl font-semibold tabular-nums text-foreground md:text-4xl">
              {totalCompletions.toLocaleString()}
            </p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Total completions</p>
          </div>
          <div className="bg-background px-6 py-8 text-center sm:text-left">
            <p className="text-3xl font-semibold tabular-nums text-foreground md:text-4xl">{contributorCount}</p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Contributors</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div id="library" className="scroll-mt-24">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Challenge library</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
                Curated containers you can open instantly. Each challenge runs in its own environment on your machine.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{totalChallenges}</span> available
            </p>
          </div>

          {fetchError && (
            <div className="mb-8 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Unable to load challenges: {fetchError.message}
            </div>
          )}

          <div className="flex flex-col gap-5">
            {list.length > 0 ? (
              list.map((container) => (
                <ChallengeFeedCard
                  key={container.id}
                  container={container}
                  userId={user?.id}
                  hasSession={activeSessions.has(container.id)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-8 py-20 text-center">
                <p className="text-base font-medium text-foreground">The library is empty</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add rows to your <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">posts</code> table
                  in Supabase, or sign in to publish a challenge.
                </p>
                {!user && (
                  <Link
                    href="/login"
                    className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Secondary: custom image — less prominent */}
        <section className="mt-20 scroll-mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
            <div className="max-w-md">
              <h3 className="text-lg font-semibold text-foreground">Run a custom image</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Advanced: start any Docker image that exposes port <span className="font-mono text-foreground">3000</span>.
                Your workspace can be resumed from the feed when you&apos;re signed in.
              </p>
              <Link
                href="/preview"
                className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
              >
                Open active session →
              </Link>
            </div>
            <form action={deployContainer} className="flex w-full max-w-md flex-col gap-4 lg:shrink-0">
              <div className="flex flex-col gap-2">
                <label htmlFor="image" className="text-sm font-medium text-foreground">
                  Image name
                </label>
                <input
                  id="image"
                  name="image"
                  type="text"
                  placeholder="e.g. my-registry/challenge:latest"
                  required
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-11 w-full rounded-lg border border-border bg-muted/60 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Launch workspace
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
