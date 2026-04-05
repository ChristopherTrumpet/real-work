'use server'

import {
  runBenchmark,
  type BenchmarkOptions,
  type BenchmarkResult,
} from '@/lib/evaluator'
import { getDockerWorkerConfig, callDockerWorkerJson } from '@/lib/worker-config'

export async function evaluateChallengeAction(options: BenchmarkOptions): Promise<BenchmarkResult> {
  try {
    if (getDockerWorkerConfig()) {
      return await callDockerWorkerJson<BenchmarkResult>('/internal/evaluate', options)
    }
    return await runBenchmark(options)
  } catch (error: unknown) {
    const err = error as { message?: string }
    return {
      correctness: false,
      total_time_ms: 0,
      max_memory_kb: 0,
      error: err.message || String(error),
      tests: [],
    }
  }
}
