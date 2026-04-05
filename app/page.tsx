import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { deployContainer } from './actions/docker'
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
    .eq('is_draft', false)

  const totalChallenges = allPosts?.length ?? 0
  const totalCompletions = allPosts?.reduce((acc, c) => acc + (c.number_of_completions ?? 0), 0) ?? 0
  const contributorCount = new Set(allPosts?.map((c) => c.user_id as string).filter(Boolean)).size

  // Fetch top 9 by rating
  const { data: topChallenges, error: fetchError } = await supabase
    .from('posts')
    .select('*, profiles!user_id(username, full_name, avatar_url)')
    .eq('is_draft', false)
    .order('average_rating', { ascending: false, nullsFirst: false })
    .order('ratings_count', { ascending: false })
    .limit(9)

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
        <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-muted-foreground sm:mx-0 sm:text-left sm:text-lg">
          Master modern engineering through hands-on challenges—debug in isolated containers, explore real scenarios, and learn from community-rated labs.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
          <Link
            href="/library"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/92 hover:shadow-md active:scale-[0.98] sm:w-auto"
          >
            Explore library
          </Link>
          {user ? (
            <Link
              href="/new"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-background/80 px-6 text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/35 hover:bg-muted/50 active:scale-[0.98] dark:border-border dark:bg-card/60 dark:hover:border-primary/40 dark:hover:bg-card/90 sm:w-auto"
            >
              Create challenge
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-transparent px-6 text-sm font-semibold text-foreground transition-all duration-200 hover:border-primary/30 hover:bg-muted/40 active:scale-[0.98] sm:w-auto"
            >
              Sign in to create
            </Link>
          )}
        </div>
      </HeroSection>

      {/* Metrics */}
      <section className="border-b border-border/80 bg-muted/25">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px bg-border/80 sm:grid-cols-3">
          <div className="group relative bg-background px-6 py-8 text-center transition-colors duration-300 hover:bg-muted/20 sm:text-left">
            <span
              className="absolute inset-x-0 top-0 h-px scale-x-0 bg-primary/60 transition-transform duration-500 ease-out group-hover:scale-x-100"
              aria-hidden
            />
            <p className="text-3xl font-semibold tabular-nums text-foreground transition-transform duration-300 ease-out group-hover:translate-y-[-1px] md:text-4xl">
              {totalChallenges}
            </p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Published challenges</p>
          </div>
          <div className="group relative bg-background px-6 py-8 text-center transition-colors duration-300 hover:bg-muted/20 sm:text-left">
            <span
              className="absolute inset-x-0 top-0 h-px scale-x-0 bg-primary/60 transition-transform duration-500 ease-out group-hover:scale-x-100"
              aria-hidden
            />
            <p className="text-3xl font-semibold tabular-nums text-foreground transition-transform duration-300 ease-out group-hover:translate-y-[-1px] md:text-4xl">
              {totalCompletions.toLocaleString()}
            </p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Total completions</p>
          </div>
          <div className="group relative bg-background px-6 py-8 text-center transition-colors duration-300 hover:bg-muted/20 sm:text-left">
            <span
              className="absolute inset-x-0 top-0 h-px scale-x-0 bg-primary/60 transition-transform duration-500 ease-out group-hover:scale-x-100"
              aria-hidden
            />
            <p className="text-3xl font-semibold tabular-nums text-foreground transition-transform duration-300 ease-out group-hover:translate-y-[-1px] md:text-4xl">
              {contributorCount}
            </p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Active contributors</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div id="library" className="scroll-mt-24">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Top rated challenges</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                The community&apos;s favorite hands-on labs—high-quality environments for real-world skills.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <Link
                href="/library"
                className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:border-primary/25 hover:bg-muted/60 active:scale-[0.98]"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.length > 0 ? (
              list.map((container, i) => (
                <div key={container.id} className="animate-fade-up" style={{ '--stagger': i * 0.1 } as React.CSSProperties}>
                  <ChallengeFeedCard
                    container={container}
                    userId={user?.id}
                    hasSession={activeSessions.has(container.id)}
                    size="md"
                  />
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-border/90 bg-muted/15 px-8 py-20 text-center transition-colors duration-300 hover:border-primary/20 hover:bg-muted/25">
                <p className="text-base font-medium text-foreground">No highly-rated challenges yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check back soon or explore the full library to find something new.
                </p>
                <Link
                  href="/library"
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/92 hover:shadow-md active:scale-[0.98]"
                >
                  Go to Library
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Secondary: custom image — less prominent */}
        <section className="mt-20 scroll-mt-8 rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-shadow duration-300 hover:shadow-md md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
            <div className="max-w-md">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">Run a custom image</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Advanced: start any Docker image that exposes port <span className="font-mono text-foreground">3000</span>.
                Your workspace can be resumed from the feed when you&apos;re signed in.
              </p>
              <Link
                href="/studio"
                className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-primary/85 hover:underline"
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
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground focus-visible:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-11 w-full rounded-lg border border-border bg-muted/50 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-muted hover:border-border active:scale-[0.99]"
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
