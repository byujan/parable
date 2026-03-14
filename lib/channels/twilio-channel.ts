import { ChannelProvider, EmailPayload, SmsPayload, VoicePayload, ChannelResult } from './types'
import {
  createCallAgent,
  makeOutboundCall,
  waitForConversation,
  deleteAgent,
  formatTranscript,
} from './elevenlabs-voice'

// Full live channel provider: Resend for email, Twilio for SMS, ElevenLabs for Voice
export class TwilioChannelProvider implements ChannelProvider {
  private accountSid: string
  private authToken: string
  private fromPhone: string

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || ''
    this.authToken = process.env.TWILIO_AUTH_TOKEN || ''
    this.fromPhone = process.env.TWILIO_PHONE_NUMBER || ''
  }

  async sendEmail(payload: EmailPayload): Promise<ChannelResult> {
    try {
      const { Resend } = await import('resend')
      const apiKey = process.env.RESEND_API_KEY
      console.log(`[RESEND] API key loaded: ${apiKey ? apiKey.substring(0, 8) + '...' : 'MISSING'}`)
      const resend = new Resend(apiKey)

      const result = await resend.emails.send({
        from: `${payload.from_name} <${payload.from_email}>`,
        to: payload.to,
        subject: payload.subject,
        html: `<!-- [SIMULATION - Authorized security training] -->\n${payload.html_body}`,
        ...(payload.reply_to ? { replyTo: payload.reply_to } : {}),
      })

      console.log('[RESEND] Full response:', JSON.stringify(result))

      if (result.error) {
        return {
          success: false,
          error: JSON.stringify(result.error),
        }
      }

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

  async sendSms(payload: SmsPayload): Promise<ChannelResult> {
    if (!this.accountSid || !this.authToken || !this.fromPhone) {
      console.log(`[CHANNEL] SMS skipped (no Twilio credentials) — would send to ${payload.to}: ${payload.body}`)
      return { success: true, metadata: { skipped: true, reason: 'no_twilio_credentials' } }
    }

    try {
      console.log(`[TWILIO] Sending SMS from ${this.fromPhone} to ${payload.to}`)
      console.log(`[TWILIO] Body: ${payload.body.substring(0, 200)}`)

      const twilio = await import('twilio')
      const client = twilio.default(this.accountSid, this.authToken)

      const message = await client.messages.create({
        body: payload.body,
        from: this.fromPhone,
        to: payload.to,
      })

      console.log(`[TWILIO] SMS sent successfully — SID: ${message.sid}`)
      return { success: true, provider_id: message.sid }
    } catch (error) {
      console.error(`[TWILIO] SMS send failed:`, error instanceof Error ? error.message : error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS send failed',
      }
    }
  }

  async makeCall(payload: VoicePayload): Promise<ChannelResult> {
    // Use ElevenLabs for AI voice calls
    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_PHONE_NUMBER_ID) {
      console.log(`[CHANNEL] Voice call skipped (no ElevenLabs credentials) — would call ${payload.to}`)
      return { success: true, metadata: { skipped: true, reason: 'no_elevenlabs_credentials' } }
    }

    try {
      // Create a temporary agent with the right persona
      const agentId = await createCallAgent({
        sessionId: payload.session_id,
        personaName: 'Parable Voice Agent',
        systemPrompt: payload.system_prompt || buildDefaultVoicePrompt(payload),
        firstMessage: payload.opening_script,
      })

      // Make the outbound call
      const callResult = await makeOutboundCall({
        agentId,
        toNumber: payload.to,
        sessionId: payload.session_id,
        targetName: payload.target_name,
      })

      if (!callResult.success || !callResult.conversation_id) {
        await deleteAgent(agentId)
        return {
          success: false,
          error: callResult.message || 'Call initiation failed',
        }
      }

      // Wait for the conversation to complete and get the transcript
      const conversation = await waitForConversation(callResult.conversation_id)
      const transcript = formatTranscript(conversation.transcript)

      console.log(`[ELEVENLABS] Call transcript:\n${transcript}`)

      // Clean up the temporary agent
      await deleteAgent(agentId)

      return {
        success: true,
        provider_id: callResult.callSid || callResult.conversation_id || undefined,
        metadata: {
          conversation_id: callResult.conversation_id,
          call_sid: callResult.callSid,
          transcript,
          status: conversation.status,
          analysis: conversation.analysis,
        },
      }
    } catch (error) {
      console.error(`[ELEVENLABS] Voice call failed:`, error instanceof Error ? error.message : error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Voice call failed',
      }
    }
  }
}

function buildDefaultVoicePrompt(payload: VoicePayload): string {
  return `You are a voice agent conducting an authorized security awareness training exercise for the company's internal training platform (similar to KnowBe4).

You are calling ${payload.target_name || 'an employee'} as part of a routine security verification exercise.

GUIDELINES:
- Stay in character as the persona described in your opening script
- Be professional, natural, and conversational
- If the target asks who you are, give a plausible business identity consistent with your opening
- If the target becomes suspicious or wants to verify, note their response and wrap up politely
- If the target provides information or agrees to take action, acknowledge and end the call
- Keep the call concise — aim for under 2 minutes
- Do NOT reveal this is a training exercise during the call`
}
