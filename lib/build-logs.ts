// Ensure singleton across module reloads in Next.js
type BuildLog = {
  logs: { timestamp: string; message: string; duration?: string; startedAt: number }[]
  status: 'building' | 'ready' | 'error'
  startTime: number
  lastStepTime: number
  result?: any
}

const globalForBuildLogs = globalThis as unknown as {
  buildLogs: Map<string, BuildLog>
}

export const buildLogs = globalForBuildLogs.buildLogs || new Map<string, BuildLog>()

if (process.env.NODE_ENV !== 'production') globalForBuildLogs.buildLogs = buildLogs

export function initBuild(id: string) {
  const now = Date.now()
  buildLogs.set(id, { 
    logs: [{ timestamp: new Date().toLocaleTimeString(), message: '--- BUILD INITIALIZED ---', startedAt: now }], 
    status: 'building',
    startTime: now,
    lastStepTime: now
  })
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds.toFixed(2)}s`
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(1)
  if (mins < 60) return `${mins}m ${secs}s`
  const hrs = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hrs}h ${remainingMins}m`
}

export function appendLog(id: string, message: string, isNewStep = false) {
  const build = buildLogs.get(id)
  if (build) {
    const now = Date.now()
    let duration: string | undefined
    
    // If it's a new step, we mark the previous step as finished and calculate its duration
    if (isNewStep && build.logs.length > 0) {
      const lastStep = build.logs[build.logs.length - 1]
      lastStep.duration = formatDuration((now - build.lastStepTime) / 1000)
      build.lastStepTime = now
    }

    build.logs.push({ 
      timestamp: new Date().toLocaleTimeString(), 
      message,
      startedAt: now,
      duration 
    })
  }
}

export function finishBuild(id: string, result: any) {
  const build = buildLogs.get(id)
  if (build) {
    const now = Date.now()
    // Finish the last step's duration
    if (build.logs.length > 0) {
      const lastStep = build.logs[build.logs.length - 1]
      lastStep.duration = formatDuration((now - build.lastStepTime) / 1000)
    }

    const totalDuration = formatDuration((now - build.startTime) / 1000)
    build.status = 'ready'
    build.result = result
    build.logs.push({ 
      timestamp: new Date().toLocaleTimeString(), 
      message: `--- BUILD SUCCESSFUL (Total: ${totalDuration}) ---`,
      startedAt: now
    })
  }
}

export function failBuild(id: string, error: string) {
  const build = buildLogs.get(id)
  if (build) {
    build.status = 'error'
    build.logs.push({ 
      timestamp: new Date().toLocaleTimeString(), 
      message: `!!! BUILD FAILED: ${error} !!!`,
      startedAt: Date.now()
    })
  }
}

export function getBuild(id: string) {
  return buildLogs.get(id)
}
