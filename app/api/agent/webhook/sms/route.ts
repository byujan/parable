import { NextRequest, NextResponse } from 'next/server'
import { writeSignal } from '@/lib/agent/signal-bus'
import { getSessionByPhone } from '@/lib/agent/session-store'
import { Signal } from '@/lib/agent/types'
import { validateTwilioSignature } from '@/lib/webhooks/twilio-auth'
import { validateE164Phone } from '@/lib/webhooks/validation'

const TWIML_EMPTY = '<Response></Response>'

function twimlResponse() {
  return new NextResponse(TWIML_EMPTY, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

// Twilio sends incoming SMS replies to this webhook
export async function POST(request: NextRequest) {
  try {
    // Verify Twilio signature
    if (!await validateTwilioSignature(request)) {
      console.warn('[WEBHOOK] Invalid Twilio signature on SMS webhook')
      return new NextResponse('Forbidden', { status: 403 })
    }

    const formData = await request.formData()

    const from = formData.get('From') as string
    const body = formData.get('Body') as string

    console.log(`[WEBHOOK] SMS received from ${from}: ${body}`)

    if (!from || !body) {
      return twimlResponse()
    }

    // Validate phone format
    if (!validateE164Phone(from)) {
      console.warn(`[WEBHOOK] Invalid phone format: ${from}`)
      return twimlResponse()
    }

    // Find active session by phone number
    const session = await getSessionByPhone(from)

    if (!session) {
      console.log(`[WEBHOOK] No active session for phone ${from}`)
      return twimlResponse()
    }

    // Find the target_index for this phone number
    const targetIndex = session.targets.findIndex((t: { phone: string }) => t.phone === from)
    console.log(`[WEBHOOK] Matched session ${session.id} target[${targetIndex}] for phone ${from}`)

    // Write signal to Supabase — the executor will pick it up
    const signal: Signal = {
      type: 'sms_reply',
      timestamp: new Date().toISOString(),
      data: { message: body, from, target_index: targetIndex >= 0 ? targetIndex : 0 },
    }

    await writeSignal(session.id, signal)
    console.log(`[WEBHOOK] Wrote sms_reply signal for session ${session.id}`)

    // Return empty TwiML — the agent will respond via a new outbound SMS
    return twimlResponse()
  } catch (error) {
    console.error('[WEBHOOK] SMS webhook error:', error)
    return twimlResponse()
  }
}
