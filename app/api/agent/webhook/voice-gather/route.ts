import { NextRequest, NextResponse } from 'next/server'
import { loadSession, saveSession } from '@/lib/agent/session-store'
import { AgentReactor } from '@/lib/agent/reactor'
import { Signal } from '@/lib/agent/types'
import { validateTwilioSignature } from '@/lib/webhooks/twilio-auth'

// Twilio calls this when the target speaks or presses a key during the call
export async function POST(request: NextRequest) {
  // Verify Twilio signature
  if (!await validateTwilioSignature(request)) {
    console.warn('[WEBHOOK] Invalid Twilio signature on voice-gather webhook')
    return new NextResponse('Forbidden', { status: 403 })
  }

  const sessionId = request.nextUrl.searchParams.get('session_id')
  const formData = await request.formData()

  const speechResult = formData.get('SpeechResult') as string | null
  const digits = formData.get('Digits') as string | null

  if (!sessionId) {
    return hangup()
  }

  const session = await loadSession(sessionId)
  if (!session || session.status !== 'running') {
    return hangup()
  }

  // Record what the target did
  let signal: Signal

  if (speechResult) {
    signal = {
      type: 'voice_speech',
      timestamp: new Date().toISOString(),
      data: { transcript: speechResult },
    }
  } else if (digits) {
    signal = {
      type: 'voice_keypress',
      timestamp: new Date().toISOString(),
      data: { digit: digits },
    }
  } else {
    return hangup()
  }

  session.signals.push(signal)
  await saveSession(session)

  console.log(`[WEBHOOK] Voice input for session ${sessionId}:`, signal.type, signal.data)

  // Ask the AI what to say next in the call
  try {
    const reactor = new AgentReactor(session.config.ai_provider, session.config.ai_model)

    const decision = await reactor.decide(session, signal)

    if (decision.action === 'end' || decision.action === 'wait') {
      // End the call
      const action = reactor.decisionToAction(decision)
      session.actions.push(action)
      await saveSession(session)

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${escapeXml(decision.content)}</Say>
  <Hangup/>
</Response>`
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
    }

    // Continue the conversation — say the next line and gather again
    const action = reactor.decisionToAction(decision)
    session.actions.push(action)
    await saveSession(session)

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/agent/webhook/voice-gather?session_id=${encodeURIComponent(sessionId)}`

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech dtmf" timeout="10" speechTimeout="auto" action="${callbackUrl}" method="POST">
    <Say>${escapeXml(decision.content)}</Say>
  </Gather>
  <Say>Thank you for your time. Goodbye.</Say>
  <Hangup/>
</Response>`

    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  } catch (error) {
    console.error('Voice gather AI error:', error)
    return hangup()
  }
}

function hangup(): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you. Goodbye.</Say>
  <Hangup/>
</Response>`
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
