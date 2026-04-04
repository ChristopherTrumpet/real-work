'use server'

import { runBenchmark, BenchmarkOptions, BenchmarkResult } from '@/lib/evaluator'

export async function evaluateChallengeAction(options: BenchmarkOptions): Promise<BenchmarkResult> {
  try {
    const result = await runBenchmark(options)
    return result
  } catch (error: any) {
    return {
      correctness: false,
      total_time_ms: 0,
      max_memory_kb: 0,
      error: error.message || String(error),
      tests: []
    }
  }
}
