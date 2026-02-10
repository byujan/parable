import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Look up the sent event by token
    const { data: sentEvent, error: sentError } = await supabase
      .from('campaign_events')
      .select('campaign_id, recipient_id')
      .eq('token', token)
      .eq('event_type', 'sent')
      .single()

    if (!sentError && sentEvent) {
      // Insert training_completed event
      await supabase.from('campaign_events').insert({
        campaign_id: sentEvent.campaign_id,
        recipient_id: sentEvent.recipient_id,
        event_type: 'training_completed',
        token: token,
        metadata: {},
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking training completion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
