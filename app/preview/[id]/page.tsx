import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import ChallengePreview from '@/components/ChallengePreview'
import { notFound } from 'next/navigation'

export default async function PreviewPostPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const supabase = await createClient()
  
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  const { data: { user } } = await supabase.auth.getUser()

  if (!post) {
    notFound()
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading Preview...</div>}>
      <ChallengePreview post={post} currentUserId={user?.id} />
    </Suspense>
  )
}
