import { NextRequest, NextResponse } from 'next/server'
import { loadSession, saveSession } from '@/lib/agent/session-store'
import { Signal } from '@/lib/agent/types'
import { validateTwilioSignature } from '@/lib/webhooks/twilio-auth'

// Twilio calls this with call status updates (answered, completed, no-answer, etc.)
export async function POST(request: NextRequest) {
  try {
    // Verify Twilio signature
    if (!await validateTwilioSignature(request)) {
      console.warn('[WEBHOOK] Invalid Twilio signature on voice-status webhook')
      return new NextResponse('Forbidden', { status: 403 })
    }

    const sessionId = request.nextUrl.searchParams.get('session_id')
    const formData = await request.formData()

    const callStatus = formData.get('CallStatus') as string
    const callDuration = formData.get('CallDuration') as string | null

    if (!sessionId) {
      return NextResponse.json({ ok: true })
    }

    const session = await loadSession(sessionId)
    if (!session) {
      return NextResponse.json({ ok: true })
    }

    let signal: Signal | null = null

    switch (callStatus) {
      case 'in-progress':
      case 'answered':
        signal = {
          type: 'voice_answered',
          timestamp: new Date().toISOString(),
          data: { call_status: callStatus },
        }
        break

      case 'no-answer':
      case 'busy':
      case 'canceled':
        signal = {
          type: 'voice_no_answer',
          timestamp: new Date().toISOString(),
          data: { call_status: callStatus },
        }
        break

      case 'completed':
        // Call ended — log it but don't push a signal that triggers a new action
        console.log(`[WEBHOOK] Call completed for session ${sessionId}, duration: ${callDuration}s`)
        break

      case 'failed':
        signal = {
          type: 'voice_no_answer',
          timestamp: new Date().toISOString(),
          data: { call_status: 'failed' },
        }
        break
    }

    if (signal) {
      session.signals.push(signal)
      await saveSession(session)
      console.log(`[WEBHOOK] Voice status for session ${sessionId}: ${callStatus}`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Voice status webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}
