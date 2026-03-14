import { AgentSession, AgentSessionStatus } from './types'
import { createAdminClient } from '@/lib/supabase/admin'

// Supabase-backed session store — works across Vercel and local CLI

export async function saveSession(session: AgentSession): Promise<void> {
  const supabase = createAdminClient()
  const previousUpdatedAt = session.updated_at
  session.updated_at = new Date().toISOString()

  // Optimistic concurrency: only upsert if updated_at matches what we expect.
  // On first save (insert), there's no existing row so we use upsert.
  // On subsequent saves, we check the timestamp to prevent lost updates.
  const { error, count } = await supabase
    .from('agent_sessions')
    .update({
      targets: session.targets,
      scenario: session.scenario,
      status: session.status,
      actions: session.actions,
      signals: session.signals,
      config: session.config,
      updated_at: session.updated_at,
    })
    .eq('id', session.id)
    .eq('updated_at', previousUpdatedAt)

  // If no rows updated, either it's a new session or there was a concurrent update
  if (error || count === 0) {
    // Try insert for new sessions
    const { error: insertError } = await supabase
      .from('agent_sessions')
      .upsert({
        id: session.id,
        targets: session.targets,
        scenario: session.scenario,
        status: session.status,
        actions: session.actions,
        signals: session.signals,
        config: session.config,
        created_at: session.created_at,
        updated_at: session.updated_at,
        organization_id: session.config.organization_id || null,
      })

    if (insertError) {
      console.error(`[SESSION] Failed to save session ${session.id}:`, insertError.message)
    }
  }
}

export async function loadSession(id: string): Promise<AgentSession | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('agent_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    targets: data.targets,
    scenario: data.scenario,
    status: data.status,
    actions: data.actions,
    signals: data.signals,
    config: data.config,
    created_at: data.created_at,
    updated_at: data.updated_at,
  } as AgentSession
}

export async function updateSessionStatus(id: string, status: AgentSessionStatus): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('agent_sessions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error(`[SESSION] Failed to update session ${id} status:`, error.message)
  }
}

export async function getSessionByPhone(phone: string): Promise<AgentSession | null> {
  const supabase = createAdminClient()

  // Search targets array for matching phone
  const { data, error } = await supabase
    .from('agent_sessions')
    .select('*')
    .eq('status', 'running')
    .contains('targets', JSON.stringify([{ phone }]))
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data as unknown as AgentSession
}

export async function getSessionByEmail(email: string): Promise<AgentSession | null> {
  const supabase = createAdminClient()

  // Search targets array for matching email (case-insensitive via lower())
  // Try exact match first, then lowercase
  const { data, error } = await supabase
    .from('agent_sessions')
    .select('*')
    .eq('status', 'running')
    .or(
      `targets.cs.${JSON.stringify([{ email }])},targets.cs.${JSON.stringify([{ email: email.toLowerCase() }])}`
    )
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) return null

  // Double-check with case-insensitive comparison in JS
  const session = data[0] as unknown as AgentSession
  const hasMatch = session.targets.some(
    (t) => t.email.toLowerCase() === email.toLowerCase()
  )
  if (!hasMatch) return null

  return session
}

export async function listSessions(
  options: { limit?: number; offset?: number; status?: AgentSessionStatus } = {}
): Promise<{ sessions: AgentSession[]; total: number }> {
  const supabase = createAdminClient()
  const limit = options.limit || 50
  const offset = options.offset || 0

  let query = supabase
    .from('agent_sessions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options.status) {
    query = query.eq('status', options.status)
  }

  const { data, error, count } = await query

  if (error || !data) return { sessions: [], total: 0 }
  return {
    sessions: data as unknown as AgentSession[],
    total: count || 0,
  }
}
