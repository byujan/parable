import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const url = searchParams.get('url')

    // Determine redirect URL
    let redirectUrl = url || process.env.NEXT_PUBLIC_APP_URL || '/'

    // Security check: prevent javascript: and data: schemes
    if (
      redirectUrl.toLowerCase().startsWith('javascript:') ||
      redirectUrl.toLowerCase().startsWith('data:')
    ) {
      redirectUrl = '/'
    }

    if (!token) {
      return NextResponse.redirect(redirectUrl)
    }

    // Look up the sent event by token
    const { data: sentEvent, error: sentError } = await supabase
      .from('campaign_events')
      .select('campaign_id, recipient_id')
      .eq('token', token)
      .eq('event_type', 'sent')
      .single()

    if (!sentError && sentEvent) {
      // Insert clicked event (allow duplicates - track every click)
      await supabase.from('campaign_events').insert({
        campaign_id: sentEvent.campaign_id,
        recipient_id: sentEvent.recipient_id,
        event_type: 'clicked',
        token: token,
        metadata: { url: url || '' },
      })
    }

    // Redirect to the target URL
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Error tracking click:', error)
    // Redirect anyway on error
    const redirectUrl = request.nextUrl.searchParams.get('url') || '/'
    return NextResponse.redirect(redirectUrl)
  }
}
