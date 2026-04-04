import { Suspense } from 'react'
import StudioWorkspace from './StudioWorkspace'

export default function StudioPage() {
  return (
    <Suspense fallback={<div>Loading Studio...</div>}>
      <StudioWorkspace />
    </Suspense>
  )
}
