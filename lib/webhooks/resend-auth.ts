import { NextRequest } from 'next/server'
import crypto from 'crypto'

/**
 * Verify Resend webhook signature using the svix library protocol.
 * If RESEND_WEBHOOK_SECRET is not set, validation is skipped (dev mode).
 */
export async function verifyResendWebhook(request: NextRequest): Promise<boolean> {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) {
    // No secret configured — skip validation in dev
    return true
  }

  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false
  }

  // Check timestamp is within 5 minutes to prevent replay attacks
  const timestampSec = parseInt(svixTimestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestampSec) > 300) {
    return false
  }

  try {
    const body = await request.clone().text()
    const signedContent = `${svixId}.${svixTimestamp}.${body}`

    // The secret is base64-encoded with a "whsec_" prefix
    const secretBytes = Buffer.from(
      webhookSecret.startsWith('whsec_') ? webhookSecret.slice(6) : webhookSecret,
      'base64'
    )

    const expectedSignature = crypto
      .createHmac('sha256', secretBytes)
      .update(signedContent)
      .digest('base64')

    // Resend sends multiple signatures separated by spaces, each prefixed with version
    const signatures = svixSignature.split(' ')
    for (const sig of signatures) {
      const [version, sigValue] = sig.split(',')
      if (version === 'v1' && sigValue === expectedSignature) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error('[RESEND-AUTH] Webhook verification error:', error)
    return false
  }
}
