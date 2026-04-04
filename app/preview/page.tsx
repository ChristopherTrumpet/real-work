import { Suspense } from 'react'
import PreviewWorkspace from './Workspace'
import { createClient } from '@/utils/supabase/server'

export default async function PreviewPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const postId = searchParams.postId as string | undefined;
  let post = null;
  let comments: any[] | undefined = undefined;

  if (postId) {
    const supabase = await createClient();
    
    // Fetch Post Details
    const { data: postData } = await supabase
      .from('posts')
      .select('*, profiles!user_id(username, full_name, avatar_url)')
      .eq('id', postId)
      .single();
    
    post = postData;

    // Fetch Comments
    if (postData) {
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('*, profiles!user_id(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
      
      comments = commentsData || [];
    }
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-zinc-900 text-white font-bold">Loading Workspace...</div>}>
      <PreviewWorkspace post={post} comments={comments} />
    </Suspense>
  )
}


