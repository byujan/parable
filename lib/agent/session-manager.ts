import { Signal } from './types'
import { AgentExecutor } from './executor'

// In-memory registry of running executor instances
// Webhooks use this to push signals into active agent loops
const runningExecutors = new Map<string, AgentExecutor>()

export function registerExecutor(executor: AgentExecutor): void {
  runningExecutors.set(executor.getSessionId(), executor)
}

export function unregisterExecutor(sessionId: string): void {
  runningExecutors.delete(sessionId)
}

export function getExecutor(sessionId: string): AgentExecutor | null {
  return runningExecutors.get(sessionId) || null
}

export async function pushSignalToSession(sessionId: string, signal: Signal): Promise<boolean> {
  const executor = runningExecutors.get(sessionId)
  if (!executor) {
    console.log(`[SESSION-MANAGER] No running executor for session ${sessionId}`)
    return false
  }

  await executor.pushSignal(signal)
  return true
}
