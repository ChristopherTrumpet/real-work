import Link from 'next/link'
import DraggableWindow from '@/components/DraggableWindow'

export default function PreviewPage() {
  return (
    <div className="relative w-full h-screen bg-zinc-100 overflow-hidden">
      <nav className="absolute top-0 left-0 right-0 p-4 bg-gray-900 text-white flex justify-between items-center z-50">
        <h1 className="font-bold">Dynamic Container Workspace</h1>
        <Link href="/" className="text-sm bg-gray-700 px-3 py-1 rounded hover:bg-gray-600 transition-colors">
          Back to Dashboard
        </Link>
      </nav>
      
      <div className="w-full h-full pt-16">
        <DraggableWindow src="http://localhost:4000" />
      </div>

      <div className="absolute bottom-4 left-4 text-xs text-gray-400 pointer-events-none">
        Drag the header to move • Use the bottom-right corner to resize
      </div>
    </div>
  )
}

