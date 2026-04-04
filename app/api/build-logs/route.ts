import { NextRequest, NextResponse } from 'next/server'
import { getBuild } from '@/lib/build-logs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing build ID' }, { status: 400 })
  }

  const build = getBuild(id)
  if (!build) {
    return NextResponse.json({ error: 'Build not found' }, { status: 404 })
  }

  return NextResponse.json(build)
}
