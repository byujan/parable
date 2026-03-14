import { NextRequest } from 'next/server'

/**
 * Validate Twilio webhook signature.
 * If TWILIO_AUTH_TOKEN is not set, validation is skipped (dev mode).
 */
export async function validateTwilioSignature(request: NextRequest): Promise<boolean> {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    // No auth token configured — skip validation in dev
    return true
  }

  const signature = request.headers.get('x-twilio-signature')
  if (!signature) {
    return false
  }

  try {
    const twilio = await import('twilio')
    const url = request.url

    // For form-encoded webhooks, we need to reconstruct the params
    // Twilio sends POST with application/x-www-form-urlencoded
    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    return twilio.validateRequest(authToken, signature, url, params)
  } catch (error) {
    console.error('[TWILIO-AUTH] Signature validation error:', error)
    return false
  }
}
