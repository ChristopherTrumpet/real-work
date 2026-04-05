import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { updateProfile } from './actions'
import { DeleteChallengeButton } from '@/components/profile/delete-challenge-button'
import { DeleteAccountButton } from '@/components/profile/DeleteAccountButton'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: myChallenges } = await supabase
    .from('posts')
    .select('id, title, difficulty, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const challenges = myChallenges ?? []

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
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

        <div className="mb-10 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Profile</h1>
          <p className="text-muted-foreground text-sm">Manage your account settings and published challenges.</p>
        </div>

        <div className="flex flex-col gap-8">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Account settings</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Logged in as{' '}
              <span className="font-medium text-foreground">{user.email}</span>
            </p>
            {profile?.username && (
              <p className="mt-2 text-sm text-muted-foreground">
                <Link
                  href={`/u/${encodeURIComponent(profile.username)}`}
                  className="font-medium text-primary hover:underline"
                >
                  View public profile →
                </Link>
              </p>
            )}

            <form action={updateProfile} className="mt-8 flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="username" className="text-sm font-medium text-foreground">
                    Username
                  </label>
                  <input id="username" name="username" type="text" defaultValue={profile?.username || ''} className={inputClass} />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="full_name" className="text-sm font-medium text-foreground">
                    Full name
                  </label>
                  <input id="full_name" name="full_name" type="text" defaultValue={profile?.full_name || ''} className={inputClass} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="avatar_url" className="text-sm font-medium text-foreground">
                  Avatar URL
                </label>
                <input id="avatar_url" name="avatar_url" type="url" defaultValue={profile?.avatar_url || ''} className={inputClass} />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="website" className="text-sm font-medium text-foreground">
                  Website
                </label>
                <input id="website" name="website" type="url" defaultValue={profile?.website || ''} className={inputClass} />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="bio" className="text-sm font-medium text-foreground">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  defaultValue={profile?.bio || ''}
                  className={`${inputClass} min-h-24 resize-y`}
                />
              </div>

              <button
                type="submit"
                className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Save changes
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:gap-4">
              <form action="/auth/signout" method="post" className="flex-1">
                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-lg border border-border bg-transparent py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
                >
                  Sign out
                </button>
              </form>
              <div className="flex-1">
                <DeleteAccountButton />
              </div>
            </div>
          </div>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Published challenges</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Challenges you have published. Deleting removes them for everyone.
            </p>

            {challenges.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                You haven&apos;t published any challenges yet.{' '}
                <Link href="/" className="font-medium text-primary hover:underline">
                  Create one from the home page
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-6 divide-y divide-border">
                {challenges.map((post) => {
                  const diff = post.difficulty || 'medium'
                  return (
                    <li key={post.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/challenge/${post.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {post.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-medium uppercase text-muted-foreground">
                            {diff}
                          </span>
                          <span>
                            {post.created_at
                              ? new Date(post.created_at).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : ''}
                          </span>
                        </div>
                      </div>
                      <DeleteChallengeButton postId={post.id} title={post.title} />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
