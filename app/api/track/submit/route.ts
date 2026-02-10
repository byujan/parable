import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const formData = await request.formData()
    const token = formData.get('token') as string

    if (!token) {
      return NextResponse.redirect(
        new URL('/', process.env.NEXT_PUBLIC_APP_URL!)
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
      // Extract field names (NOT values) from form data
      const fieldNames: string[] = []
      formData.forEach((_value, key) => {
        if (key !== 'token') {
          fieldNames.push(key)
        }
      })

      // Insert submitted event
      await supabase.from('campaign_events').insert({
        campaign_id: sentEvent.campaign_id,
        recipient_id: sentEvent.recipient_id,
        event_type: 'submitted',
        token: token,
        metadata: { fields: fieldNames },
      })
    }

    // Redirect to training page
    return NextResponse.redirect(
      new URL(`/training/${token}`, process.env.NEXT_PUBLIC_APP_URL!)
    )
  } catch (error) {
    console.error('Error tracking submit:', error)
    return NextResponse.redirect(
      new URL('/', process.env.NEXT_PUBLIC_APP_URL!)
    )
  }
}
