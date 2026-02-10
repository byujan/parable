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

    if (!token) {
      return new NextResponse(null, { status: 400 })
    }

    // Look up the sent event by token
    const { data: sentEvent, error: sentError } = await supabase
      .from('campaign_events')
      .select('campaign_id, recipient_id')
      .eq('token', token)
      .eq('event_type', 'sent')
      .single()

    if (sentError || !sentEvent) {
      // Still return pixel even if event not found
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      )
      return new NextResponse(pixel, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache',
        },
      })
    }

    // Check if already opened
    const { data: existingOpen } = await supabase
      .from('campaign_events')
      .select('id')
      .eq('token', token)
      .eq('event_type', 'opened')
      .single()

    // Insert opened event only if not already opened
    if (!existingOpen) {
      await supabase.from('campaign_events').insert({
        campaign_id: sentEvent.campaign_id,
        recipient_id: sentEvent.recipient_id,
        event_type: 'opened',
        token: token,
        metadata: {},
      })
    }

    // Return transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )
    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache',
      },
    })
  } catch (error) {
    console.error('Error tracking open:', error)

    // Still return pixel on error
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )
    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache',
      },
    })
  }
}
