import { NextRequest, NextResponse } from 'next/server'
import { writeSignal } from '@/lib/agent/signal-bus'
import { getSessionByEmail } from '@/lib/agent/session-store'
import { Signal } from '@/lib/agent/types'
import { verifyResendWebhook } from '@/lib/webhooks/resend-auth'
import { validateEmail } from '@/lib/webhooks/validation'

// Resend inbound email webhook — receives email.received events
export async function POST(request: NextRequest) {
  try {
    // Verify Resend webhook signature
    if (!await verifyResendWebhook(request)) {
      console.warn('[WEBHOOK] Invalid Resend webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const payload = await request.json()

    console.log(`[WEBHOOK] Received event: ${payload.type}`)

    if (payload.type !== 'email.received') {
      return NextResponse.json({ ok: true })
    }

    const { email_id, from, to, subject } = payload.data

    console.log(`[WEBHOOK] Inbound email from ${from} to ${JSON.stringify(to)} — subject: "${subject}"`)

    // Fetch the full email body from Resend API
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.error('[WEBHOOK] RESEND_API_KEY not set')
      return NextResponse.json({ error: 'missing api key' }, { status: 500 })
    }

    const emailResponse = await fetch(`https://api.resend.com/emails/receiving/${email_id}`, {
      headers: { Authorization: `Bearer ${resendApiKey}` },
    })

    if (!emailResponse.ok) {
      console.error(`[WEBHOOK] Failed to fetch email ${email_id}: ${emailResponse.status}`)
      return NextResponse.json({ ok: true })
    }

    const emailData = await emailResponse.json()
    const replyText = emailData.text || stripHtml(emailData.html || '')

    console.log(`[WEBHOOK] Reply body: ${replyText.substring(0, 200)}`)

    // Find active session for this sender
    const senderEmail = extractEmail(from)
    if (!validateEmail(senderEmail)) {
      console.warn(`[WEBHOOK] Invalid sender email: ${senderEmail}`)
      return NextResponse.json({ ok: true })
    }
    const session = await getSessionByEmail(senderEmail)

    if (!session) {
      console.log(`[WEBHOOK] No active session for ${senderEmail}`)
      return NextResponse.json({ ok: true })
    }

    // Find the target_index for this email
    const targetIndex = session.targets.findIndex(
      (t: { email: string }) => t.email.toLowerCase() === senderEmail.toLowerCase()
    )
    console.log(`[WEBHOOK] Matched session ${session.id} target[${targetIndex}] for ${senderEmail}`)

    // Write signal to Supabase — the executor will pick it up
    const signal: Signal = {
      type: 'email_reply',
      timestamp: new Date().toISOString(),
      data: {
        message: replyText,
        subject: subject,
        from: from,
        target_index: targetIndex >= 0 ? targetIndex : 0,
      },
    }

    // Use email_id as idempotency key to prevent duplicate processing
    const idempotencyKey = `email_reply:${email_id}`
    await writeSignal(session.id, signal, idempotencyKey)
    console.log(`[WEBHOOK] Wrote email_reply signal for session ${session.id}`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[WEBHOOK] Email webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}
