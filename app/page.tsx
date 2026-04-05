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

  // Fetch all for metrics
  const { data: allPosts } = await supabase
    .from('posts')
    .select('id, user_id, number_of_completions')

  const totalChallenges = allPosts?.length ?? 0
  const totalCompletions = allPosts?.reduce((acc, c) => acc + (c.number_of_completions ?? 0), 0) ?? 0
  const contributorCount = new Set(allPosts?.map((c) => c.user_id as string).filter(Boolean)).size

  // Fetch top 5 by rating
  const { data: topChallenges, error: fetchError } = await supabase
    .from('posts')
    .select('*, profiles!user_id(username, full_name, avatar_url)')
    .order('average_rating', { ascending: false, nullsFirst: false })
    .order('ratings_count', { ascending: false })
    .limit(5)

  const list = (topChallenges ?? []) as ChallengeFeedItem[]

  const activeSessions = new Set<string>()
  if (user && list.length) {
    list.forEach((container) => {
      const localPath = path.join(process.cwd(), 'container_data', user.id, container.id)
      if (fs.existsSync(localPath)) {
        activeSessions.add(container.id)
      }
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <HeroSection>
        <p className="mx-auto mt-5 max-w-2xl text-center text-base leading-relaxed text-muted-foreground sm:mx-0 sm:text-left sm:text-lg">
          Master modern engineering through hands-on challenges. Explore real-world scenarios, debug in isolated containers, and level up your skills with community-rated content.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
          <Link
            href="/library"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Explore library
          </Link>
          {user ? (
            <Link
              href="/new"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted sm:w-auto"
            >
              Create challenge
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted sm:w-auto"
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
            <p className="mt-1 text-sm font-medium text-muted-foreground">Active contributors</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div id="library" className="scroll-mt-24">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Top Rated Challenges</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
                The community&apos;s favorite hands-on labs. High-quality environments designed to test your real-world skills.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <Link
                href="/library"
                className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                View all challenges
              </Link>
            </div>
          </div>

          {fetchError && (
            <div className="mb-8 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Unable to load challenges: {fetchError.message}
            </div>
          )}

          <div className="flex flex-col gap-5">
            {list.length > 0 ? (
              <>
                {list.map((container) => (
                  <ChallengeFeedCard
                    key={container.id}
                    container={container}
                    userId={user?.id}
                    hasSession={activeSessions.has(container.id)}
                  />
                ))}
                <div className="mt-8 flex justify-center">
                  <Link
                    href="/library"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-8 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                  >
                    View all challenges
                  </Link>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-8 py-20 text-center">
                <p className="text-base font-medium text-foreground">No highly-rated challenges yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check back soon or explore the full library to find something new.
                </p>
                <Link
                  href="/library"
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                >
                  Go to Library
                </Link>
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
                href="/studio"
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
