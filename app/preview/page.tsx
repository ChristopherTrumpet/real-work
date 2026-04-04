import { Suspense } from 'react'
import PreviewWorkspace from './Workspace'

export default function PreviewPage() {
  // This server component wraps the client component, providing a Suspense boundary
  // which is good practice when dealing with client components that use searchParams.
  return (
    <Suspense fallback={<div>Loading Workspace...</div>}>
      <PreviewWorkspace />
    </Suspense>
  )
}


