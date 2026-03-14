import { createAdminClient } from '@/lib/supabase/admin'
import { Signal } from './types'

// Supabase-backed signal bus for cross-process communication
// Webhooks (Vercel) write signals here, the executor (local/remote) polls and consumes them

// Write a signal for a session (called by webhooks)
// Optional idempotencyKey prevents duplicate signal processing
export async function writeSignal(
  sessionId: string,
  signal: Signal,
  idempotencyKey?: string,
): Promise<void> {
  const supabase = createAdminClient()

  const row: Record<string, unknown> = { session_id: sessionId, signal }
  if (idempotencyKey) {
    row.idempotency_key = idempotencyKey
  }

  const { error } = await supabase
    .from('agent_signals')
    .insert(row)

  if (error) {
    // Ignore unique constraint violations for idempotent writes
    if (idempotencyKey && error.code === '23505') {
      console.log(`[SIGNAL-BUS] Duplicate signal ignored (key: ${idempotencyKey})`)
      return
    }
    console.error(`[SIGNAL-BUS] Failed to write signal for ${sessionId}:`, error.message)
  }
}

// Atomically read and consume pending signals for a session (called by executor)
// Uses RPC to run UPDATE ... RETURNING in a single atomic operation,
// preventing race conditions where two executors consume the same signal.
export async function consumeSignals(sessionId: string): Promise<Signal[]> {
  const supabase = createAdminClient()

  // Atomic consume: update and return in one operation
  const { data, error } = await supabase.rpc('consume_agent_signals', {
    p_session_id: sessionId,
  })

  if (error) {
    console.error(`[SIGNAL-BUS] Failed to consume signals for ${sessionId}:`, error.message)
    // Fallback to non-atomic approach if RPC doesn't exist yet
    return consumeSignalsFallback(sessionId)
  }

  if (!data || data.length === 0) return []

  return data.map((row: { signal: unknown }) => row.signal as Signal)
}

// Fallback for when the RPC function isn't deployed yet
async function consumeSignalsFallback(sessionId: string): Promise<Signal[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('agent_signals')
    .select('id, signal')
    .eq('session_id', sessionId)
    .eq('consumed', false)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(`[SIGNAL-BUS] Fallback read failed for ${sessionId}:`, error.message)
    return []
  }

  if (!data || data.length === 0) return []

  // Mark as consumed
  const ids = data.map((row) => row.id)
  const { error: updateError } = await supabase
    .from('agent_signals')
    .update({ consumed: true })
    .in('id', ids)

  if (updateError) {
    console.error(`[SIGNAL-BUS] Failed to mark signals consumed:`, updateError.message)
  }

  return data.map((row) => row.signal as Signal)
}
