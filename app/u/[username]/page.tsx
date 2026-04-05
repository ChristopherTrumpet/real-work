import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DifficultyWheel from '@/components/DifficultyWheel'
import { ContributionHeatmap } from '@/components/ContributionHeatmap'
import { UserPublishedChallenges } from '@/components/profile/UserPublishedChallenges'

type PageProps = { params: Promise<{ username: string }> }

export default async function PublicProfilePage({ params }: PageProps) {
  const { username: raw } = await params
  const username = decodeURIComponent(raw)

  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const { data: profile, error } = await supabase.from('profiles').select('*').ilike('username', username).maybeSingle()

  if (error || !profile?.username) {
    notFound()
  }

  // Fetch initial posts for activity and list
  const { data: initialPosts } = await supabase
    .from('posts')
    .select('id, title, description, difficulty, tags, number_of_completions, average_rating, ratings_count, created_at, user_id')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .range(0, 9) // Fetch first PAGE_SIZE (10)

  // Fetch all posts for activity map (we need all timestamps, not paginated)
  const { data: allPosts } = await supabase
    .from('posts')
    .select('created_at')
    .eq('user_id', profile.id)

  // Fetch completions for activity
  const { data: completions } = await supabase
    .from('user_completions')
    .select('completed_at')
    .eq('user_id', profile.id)

  const { data: probStats } = await supabase
    .from('user_problem_statistics')
    .select('easy_solved, medium_solved, hard_solved, problems_solved')
    .eq('user_id', profile.id)
    .maybeSingle()

  const { data: rateStats } = await supabase
    .from('user_rating_statistics')
    .select('ratings_given, average_stars_given')
    .eq('user_id', profile.id)
    .maybeSingle()

  const list = initialPosts ?? []
  const createdEasy = list.filter((p) => p.difficulty === 'easy').length
  const createdMed = list.filter((p) => p.difficulty === 'medium').length
  const createdHard = list.filter((p) => p.difficulty === 'hard').length

  const isOwn = currentUser?.id === profile.id

  // Process activity data for heatmap
  const activityMap = new Map<string, number>()
  
  allPosts?.forEach(p => {
    const date = new Date(p.created_at).toISOString().split('T')[0]
    activityMap.set(date, (activityMap.get(date) || 0) + 1)
  })
  
  completions?.forEach(c => {
    const date = new Date(c.completed_at).toISOString().split('T')[0]
    activityMap.set(date, (activityMap.get(date) || 0) + 1)
  })

  const heatmapData = Array.from(activityMap.entries()).map(([date, count]) => ({
    date,
    count
  }))

  return (
    <div className="min-h-screen bg-background pb-12">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/" className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground">
          ← Return Home
        </Link>

        <div className="mb-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="size-24 sm:size-32 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username || 'User'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-4xl font-bold text-muted-foreground">
                  {(profile.username?.[0] || 'U').toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground">{profile.full_name || profile.username}</h1>
              <p className="text-muted-foreground mt-1 text-lg">@{profile.username}</p>
              {profile.bio && <p className="mt-4 text-sm text-foreground/90 max-w-xl whitespace-pre-wrap">{profile.bio}</p>}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-primary hover:underline"
                >
                  {profile.website}
                </a>
              )}
            </div>
          </div>
          {isOwn && (
            <Link
              href="/profile"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Edit profile
            </Link>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-2 mb-12">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Challenges solved</h2>
            <DifficultyWheel
              easy={Number(probStats?.easy_solved ?? 0)}
              medium={Number(probStats?.medium_solved ?? 0)}
              hard={Number(probStats?.hard_solved ?? 0)}
              centerLabel="Solved"
            />
          </section>
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Challenges created</h2>
            <DifficultyWheel easy={createdEasy} medium={createdMed} hard={createdHard} centerLabel="Created" />
            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm border-t border-border pt-4">
              <div>
                <dt className="text-muted-foreground">Total published</dt>
                <dd className="font-semibold text-foreground text-lg">{list.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ratings given</dt>
                <dd className="font-semibold text-foreground text-lg">{rateStats?.ratings_given ?? 0}</dd>
              </div>
              {rateStats?.average_stars_given != null && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Avg stars they give</dt>
                  <dd className="font-semibold text-foreground">{Number(rateStats.average_stars_given).toFixed(2)}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>

        {/* Heatmap section */}
        <div className="mb-12">
          <ContributionHeatmap data={heatmapData} username={profile.username || ''} />
        </div>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-5">Published challenges</h2>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No challenges yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/challenge/${p.id}`}
                    className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground">{p.title}</span>
                      <span className="text-[10px] uppercase font-bold shrink-0 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {p.difficulty || 'medium'}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {p.number_of_completions ?? 0} solves · ★{' '}
                      {p.average_rating != null ? Number(p.average_rating).toFixed(1) : '—'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
