'use client'

import React from 'react'
import { BenchmarkResult } from '@/lib/evaluator'

export default function BenchmarkResults({ result, onClose }: { result: BenchmarkResult, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Performance Report
              {result.correctness ? (
                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full uppercase tracking-wider">Correct</span>
              ) : (
                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full uppercase tracking-wider">Incorrect</span>
              )}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">Algorithm Efficiency & Effectiveness Analysis</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-8">
          {result.error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap">
              <strong>Evaluation Error:</strong> {result.error}
            </div>
          )}

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-2xl text-center">
              <span className="text-xs font-bold uppercase text-blue-500 block mb-1">Total Time</span>
              <span className="text-3xl font-black text-blue-700 dark:text-blue-300">{result.total_time_ms.toFixed(2)}<small className="text-sm ml-1">ms</small></span>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/50 rounded-2xl text-center">
              <span className="text-xs font-bold uppercase text-purple-500 block mb-1">Max Memory</span>
              <span className="text-3xl font-black text-purple-700 dark:text-purple-300">{(result.max_memory_kb / 1024).toFixed(2)}<small className="text-sm ml-1">MB</small></span>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-center">
              <span className="text-xs font-bold uppercase text-zinc-500 block mb-1">Test Pass Rate</span>
              <span className="text-3xl font-black text-zinc-700 dark:text-zinc-300">
                {result.tests.filter(t => t.passed).length} / {result.tests.length}
              </span>
            </div>
          </div>

          {/* Test Case Details */}
          <div>
            <h3 className="text-lg font-bold mb-4 px-1">Test Breakdown</h3>
            <div className="space-y-4">
              {result.tests.map((test, i) => (
                <div key={i} className={`border rounded-2xl overflow-hidden ${test.passed ? 'border-zinc-200 dark:border-zinc-800' : 'border-red-200 dark:border-red-800'}`}>
                  <div className={`px-4 py-3 flex justify-between items-center ${test.passed ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'bg-red-50 dark:bg-red-900/10'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${test.passed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {test.passed ? '✓' : '✗'}
                      </span>
                      <span className="font-bold text-sm">Test Case #{test.test_index + 1}</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-zinc-500">Time: <b className="text-zinc-700 dark:text-zinc-300">{test.user_time_ms.toFixed(2)}ms</b></span>
                      <span className="text-zinc-500">Gold: <b className="text-zinc-700 dark:text-zinc-300">{test.gold_time_ms.toFixed(2)}ms</b></span>
                    </div>
                  </div>
                  
                  {!test.passed && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">Expected (Gold)</span>
                        <pre className="p-2 bg-zinc-50 dark:bg-black rounded border border-zinc-100 dark:border-zinc-800 text-xs overflow-x-auto">
                          {test.expected_output || '(Empty)'}
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-red-400">Actual (User)</span>
                        <pre className="p-2 bg-red-50/30 dark:bg-black rounded border border-red-100 dark:border-red-900/50 text-xs overflow-x-auto text-red-600 dark:text-red-400">
                          {test.actual_output || '(Empty)'}
                        </pre>
                      </div>
                      {test.error && (
                        <div className="md:col-span-2 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-red-400">Error / Stderr</span>
                          <pre className="p-2 bg-red-50/30 dark:bg-black rounded border border-red-100 dark:border-red-900/50 text-xs overflow-x-auto text-red-500">
                            {test.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  )
}
