import { ChannelProvider, EmailPayload, SmsPayload, VoicePayload, ChannelResult } from './types'

// Callback for interactive mock mode (CLI testing)
export type MockInteractionCallback = (
  channel: 'email' | 'sms' | 'voice',
  payload: EmailPayload | SmsPayload | VoicePayload
) => Promise<Record<string, unknown> | null>

let interactionCallback: MockInteractionCallback | null = null

export function setMockInteractionCallback(cb: MockInteractionCallback | null): void {
  interactionCallback = cb
}

export class MockChannelProvider implements ChannelProvider {
  async sendEmail(payload: EmailPayload): Promise<ChannelResult> {
    console.log('\n' + '='.repeat(60))
    console.log('[MOCK EMAIL]')
    console.log(`  To:      ${payload.to}`)
    console.log(`  From:    ${payload.from_name} <${payload.from_email}>`)
    console.log(`  Subject: ${payload.subject}`)
    console.log('  Body:')
    // Strip HTML tags for console display
    const textBody = payload.html_body
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
    console.log(`  ${textBody.split('\n').join('\n  ')}`)
    console.log('='.repeat(60) + '\n')

    if (interactionCallback) {
      await interactionCallback('email', payload)
    }

    return { success: true, provider_id: `mock-email-${Date.now()}` }
  }

  async sendSms(payload: SmsPayload): Promise<ChannelResult> {
    console.log('\n' + '-'.repeat(40))
    console.log('[MOCK SMS]')
    console.log(`  To:   ${payload.to}`)
    console.log(`  Body: ${payload.body}`)
    console.log('-'.repeat(40) + '\n')

    if (interactionCallback) {
      await interactionCallback('sms', payload)
    }

    return { success: true, provider_id: `mock-sms-${Date.now()}` }
  }

  async makeCall(payload: VoicePayload): Promise<ChannelResult> {
    console.log('\n' + '*'.repeat(50))
    console.log('[MOCK VOICE CALL]')
    console.log(`  Calling: ${payload.to}`)
    console.log(`  Script:  ${payload.opening_script}`)
    console.log('*'.repeat(50) + '\n')

    if (interactionCallback) {
      await interactionCallback('voice', payload)
    }

    return { success: true, provider_id: `mock-voice-${Date.now()}` }
  }
}
