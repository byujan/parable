import { ChannelProvider } from './types'
import { MockChannelProvider } from './mock'
import { TwilioChannelProvider } from './twilio-channel'

export function getChannelProvider(mock?: boolean): ChannelProvider {
  const useMock = mock ?? process.env.USE_MOCK_CHANNELS === 'true'
  if (useMock) {
    return new MockChannelProvider()
  }
  return new TwilioChannelProvider()
}

export type { ChannelProvider, EmailPayload, SmsPayload, VoicePayload, ChannelResult } from './types'
