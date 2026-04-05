import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ReadOnlyStarRating } from '@/components/read-only-star-rating'
import { CompletionFeedbackForm } from './CompletionFeedbackForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Rocket, CheckCircle2, ShieldCheck, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary),0.08),transparent_50%)]" />
      </div>

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-20">
        <div className="mb-12 animate-fade-up" style={{ '--stagger': 0 } as React.CSSProperties}>
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <header className="mb-12 space-y-4 animate-fade-up" style={{ '--stagger': 1 } as React.CSSProperties}>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-4 py-1.5 shadow-[0_0_1rem_-0.25rem_rgba(16,185,129,0.2)]">
            <Trophy className="size-4 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">Mission Accomplished</span>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {post.title}
          </h1>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium italic">
            <CheckCircle2 className="size-4 text-emerald-500/60" />
            Completed on {new Date(completion.completed_at).toLocaleDateString(undefined, { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 mb-12 animate-fade-up" style={{ '--stagger': 2 } as React.CSSProperties}>
          <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 transition-all hover:border-primary/30">
            <div className="relative z-10 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Difficulty Level</p>
              <p className={cn(
                "text-2xl font-bold capitalize",
                post.difficulty === 'easy' ? 'text-emerald-500' : 
                post.difficulty === 'hard' ? 'text-rose-500' : 'text-amber-500'
              )}>
                {post.difficulty || 'medium'}
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
              <ShieldCheck className="size-32" />
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 transition-all hover:border-primary/30">
            <div className="relative z-10 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Global Solves</p>
              <p className="text-2xl font-bold text-foreground">
                {(post.number_of_completions ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
              <Rocket className="size-32" />
            </div>
          </div>

          <div className="sm:col-span-2 rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-8 transition-all hover:border-primary/30">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Community Sentiment</p>
              <Link href={`/challenge/${post.id}`} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
                View Lab Details →
              </Link>
            </div>
            <ReadOnlyStarRating
              averageRating={post.average_rating}
              ratingsCount={post.ratings_count}
              className="bg-transparent p-0"
            />
          </div>
        </div>

        <div className="animate-fade-up" style={{ '--stagger': 3 } as React.CSSProperties}>
          <CompletionFeedbackForm postId={post.id} initialRating={myRating?.rating ?? null} />
        </div>
      </main>
    </div>
  )
}
