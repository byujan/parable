import { NextRequest, NextResponse } from 'next/server'
import { loadSession } from '@/lib/agent/session-store'
import { validateTwilioSignature } from '@/lib/webhooks/twilio-auth'

// Twilio calls this URL when the voice call connects to get TwiML instructions
export async function POST(request: NextRequest) {
  // Verify Twilio signature
  if (!await validateTwilioSignature(request)) {
    console.warn('[WEBHOOK] Invalid Twilio signature on voice-twiml webhook')
    return new NextResponse('Forbidden', { status: 403 })
  }

  const sessionId = request.nextUrl.searchParams.get('session_id')

  if (!sessionId) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>This is a test call. Goodbye.</Say>
  <Hangup/>
</Response>`
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  const session = await loadSession(sessionId)
  if (!session) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, there was an error. Goodbye.</Say>
  <Hangup/>
</Response>`
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  // Find the most recent voice action for the opening script
  const voiceAction = [...session.actions].reverse().find((a) => a.channel === 'voice')
  const script = voiceAction?.content || 'Hello, this is a call regarding your account.'

  // Use Gather to capture the target's speech or keypress
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/agent/webhook/voice-gather?session_id=${encodeURIComponent(sessionId)}`

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech dtmf" timeout="10" speechTimeout="auto" action="${callbackUrl}" method="POST">
    <Say>${escapeXml(script)}</Say>
  </Gather>
  <Say>We didn't receive a response. Goodbye.</Say>
  <Hangup/>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}

// Also handle GET for Twilio compatibility
export async function GET(request: NextRequest) {
  return POST(request)
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
