import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import DraftWorkspace from './DraftWorkspace'

export default async function StudioPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const supabase = await createClient()
  
  const { data: post } = await supabase
    .from('posts')
    .select('*, profiles!user_id(username)')
    .eq('id', id)
    .single()

  if (!post || !post.is_draft) {
    notFound()
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading Workspace...</div>}>
      <DraftWorkspace post={post} />
    </Suspense>
  )
}
