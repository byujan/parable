import { NextRequest, NextResponse } from 'next/server'
import { verifyResendWebhook } from '@/lib/webhooks/resend-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Resend webhook for email delivery status events (bounced, complained, delivered)
export async function POST(request: NextRequest) {
  try {
    if (!await verifyResendWebhook(request)) {
      console.warn('[WEBHOOK] Invalid Resend signature on email-status webhook')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const payload = await request.json()
    const eventType = payload.type

    console.log(`[WEBHOOK] Email status event: ${eventType}`)

    const supabase = createAdminClient()

    // Map Resend event types to our event types
    const eventMap: Record<string, string> = {
      'email.delivered': 'delivered',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
      'email.delivery_delayed': 'deferred',
    }

    const mappedType = eventMap[eventType]
    if (!mappedType) {
      return NextResponse.json({ ok: true })
    }

    const emailId = payload.data?.email_id
    if (!emailId) {
      return NextResponse.json({ ok: true })
    }

    // Find campaign events that match this email (via provider_id stored in metadata)
    // For now, log it — full matching requires storing resend email IDs in campaign_events
    console.log(`[WEBHOOK] Email ${emailId} status: ${mappedType}`)

    // Try to find and update matching campaign event
    const { data: events } = await supabase
      .from('campaign_events')
      .select('id, campaign_id, recipient_id, token')
      .eq('event_type', 'sent')
      .limit(1)

    // Record the delivery status event if we can match it
    if (events && events.length > 0) {
      const to = payload.data?.to
      if (to) {
        // Find recipient by email
        const { data: recipients } = await supabase
          .from('recipients')
          .select('id')
          .eq('email', Array.isArray(to) ? to[0] : to)
          .limit(1)

        if (recipients && recipients.length > 0) {
          // Find the most recent sent event for this recipient
          const { data: sentEvents } = await supabase
            .from('campaign_events')
            .select('campaign_id, token')
            .eq('recipient_id', recipients[0].id)
            .eq('event_type', 'sent')
            .order('created_at', { ascending: false })
            .limit(1)

          if (sentEvents && sentEvents.length > 0) {
            await supabase.from('campaign_events').insert({
              campaign_id: sentEvents[0].campaign_id,
              recipient_id: recipients[0].id,
              token: sentEvents[0].token,
              event_type: mappedType,
              error_message: mappedType === 'bounced'
                ? payload.data?.bounce?.message || 'Email bounced'
                : undefined,
            })
            console.log(`[WEBHOOK] Recorded ${mappedType} event for recipient ${recipients[0].id}`)
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[WEBHOOK] Email status webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}
