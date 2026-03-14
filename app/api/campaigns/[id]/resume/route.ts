import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadSession } from '@/lib/agent/session-store'
import { AgentExecutor } from '@/lib/agent/executor'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('id, status, agent_session_id')
    .eq('id', params.id)
    .single()

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (campaign.status !== 'paused') {
    return NextResponse.json({ error: 'Campaign is not paused' }, { status: 400 })
  }

  if (!campaign.agent_session_id) {
    return NextResponse.json({ error: 'No agent session to resume' }, { status: 400 })
  }

  // Load the existing session
  const session = await loadSession(campaign.agent_session_id)
  if (!session) {
    return NextResponse.json({ error: 'Agent session not found' }, { status: 404 })
  }

  // Create a new executor from the existing session and resume
  const executor = new AgentExecutor(
    session.targets,
    session.scenario,
    session.config,
  )
  // Override with existing session ID
  executor.resumeFrom(session)

  // Update campaign status
  await supabase
    .from('campaigns')
    .update({
      status: 'active',
      paused_at: null,
    })
    .eq('id', params.id)

  // Run in background
  executor.run().catch((err) => {
    console.error(`[CAMPAIGN] Resumed agent session ${campaign.agent_session_id} failed:`, err)
  })

  return NextResponse.json({ status: 'active', campaign_id: params.id })
}
