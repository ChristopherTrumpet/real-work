import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ReadOnlyStarRating } from '@/components/read-only-star-rating'
import { CompletionFeedbackForm } from './CompletionFeedbackForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

type PageProps = { params: Promise<{ id: string }> }

export default async function ChallengeCompletePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: post, error } = await supabase
    .from('posts')
    .select('id, title, difficulty, number_of_completions, average_rating, ratings_count')
    .eq('id', id)
    .maybeSingle()

  if (error || !post) {
    notFound()
  }

  const { data: completion } = await supabase
    .from('user_completions')
    .select('completed_at')
    .eq('post_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!completion) {
    redirect(`/challenge/${id}`)
  }

  const { data: myRating } = await supabase
    .from('post_ratings')
    .select('rating')
    .eq('post_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-2">
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
        <span className="text-muted-foreground/30">|</span>
        <Link href={`/challenge/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          Challenge page
        </Link>
      </div>

      <header className="mt-8">
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Challenge completed</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{post.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Completed on {new Date(completion.completed_at).toLocaleString()}
        </p>
      </header>

      <section className="mt-10 grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Difficulty</p>
          <p className="mt-1 text-lg font-medium capitalize text-foreground">{post.difficulty || 'medium'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total solves</p>
          <p className="mt-1 text-lg font-medium text-foreground">
            {(post.number_of_completions ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="sm:col-span-2">
          <ReadOnlyStarRating
            averageRating={post.average_rating}
            ratingsCount={post.ratings_count}
            className="rounded-xl bg-muted/40 p-4"
          />
        </div>
      </section>

      <CompletionFeedbackForm postId={post.id} initialRating={myRating?.rating ?? null} />
    </main>
  )
}
