import { ChannelProvider, EmailPayload, SmsPayload, VoicePayload, ChannelResult } from './types'

// Real email via Resend — SMS and voice gracefully skip
export class ResendEmailProvider implements ChannelProvider {
  async sendEmail(payload: EmailPayload): Promise<ChannelResult> {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      const sendOptions: Record<string, unknown> = {
        from: `${payload.from_name} <${payload.from_email}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html_body,
        headers: {
          'X-Entity-Ref-ID': crypto.randomUUID(),
        },
      }

      if (payload.reply_to) {
        sendOptions.reply_to = payload.reply_to
      }

      const result = await resend.emails.send(sendOptions as any)

      return {
        success: true,
        provider_id: result?.data?.id,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed',
      }
    }
  }

  async sendSms(_payload: SmsPayload): Promise<ChannelResult> {
    return { success: false, error: 'SMS not available with Resend-only provider' }
  }

  async makeCall(_payload: VoicePayload): Promise<ChannelResult> {
    return { success: false, error: 'Voice not available with Resend-only provider' }
  }
}
