import { NextRequest, NextResponse } from 'next/server'
import { runBenchmark, type BenchmarkOptions } from '@/lib/evaluator'
import { getDockerWorkerConfig, callDockerWorkerJson } from '@/lib/worker-config'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BenchmarkOptions

    if (!body.containerId || !body.language || !body.userCode || !body.goldCode || !body.testCases) {
      return NextResponse.json({ error: 'Missing required benchmark options' }, { status: 400 })
    }

    if (getDockerWorkerConfig()) {
      const result = await callDockerWorkerJson<Awaited<ReturnType<typeof runBenchmark>>>(
        '/internal/evaluate',
        body
      )
      return NextResponse.json(result)
    }

    const result = await runBenchmark(body)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('API benchmark error:', error)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
