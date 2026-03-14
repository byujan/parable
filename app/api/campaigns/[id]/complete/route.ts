import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getExecutor } from '@/lib/agent/session-manager'
import { updateSessionStatus } from '@/lib/agent/session-store'

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

  if (campaign.status !== 'active' && campaign.status !== 'paused') {
    return NextResponse.json({ error: 'Campaign is not active or paused' }, { status: 400 })
  }

  // Stop the agent executor if still running
  if (campaign.agent_session_id) {
    const executor = getExecutor(campaign.agent_session_id)
    if (executor) {
      executor.stop()
    }
    await updateSessionStatus(campaign.agent_session_id, 'completed')
  }

  // Mark campaign as completed
  await supabase
    .from('campaigns')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  return NextResponse.json({ status: 'completed', campaign_id: params.id })
}
