import { NextRequest, NextResponse } from 'next/server'
import { runBenchmark, BenchmarkOptions } from '@/lib/evaluator'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BenchmarkOptions
    
    // Validate inputs
    if (!body.containerId || !body.language || !body.userCode || !body.goldCode || !body.testCases) {
      return NextResponse.json(
        { error: 'Missing required benchmark options' },
        { status: 400 }
      )
    }

    const result = await runBenchmark(body)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('API benchmark error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
