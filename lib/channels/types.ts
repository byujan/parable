export interface EmailPayload {
  to: string
  from_email: string
  from_name: string
  subject: string
  html_body: string
  reply_to?: string  // inbound address so replies come back to us
}

export interface SmsPayload {
  to: string
  body: string
}

export interface VoicePayload {
  to: string
  opening_script: string
  session_id: string
  system_prompt?: string   // persona prompt for AI voice agent
  target_name?: string     // target's name for personalization
}

export interface ChannelResult {
  success: boolean
  provider_id?: string
  error?: string
  metadata?: Record<string, unknown>
}

export interface ChannelProvider {
  sendEmail(payload: EmailPayload): Promise<ChannelResult>
  sendSms(payload: SmsPayload): Promise<ChannelResult>
  makeCall(payload: VoicePayload): Promise<ChannelResult>
}
