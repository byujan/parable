// ElevenLabs Conversational AI voice channel
// Creates a dynamic agent per call with the right persona, makes outbound calls via Twilio,
// and fetches conversation transcripts after the call completes.

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1'

interface ElevenLabsCallResult {
  success: boolean
  conversation_id: string | null
  callSid: string | null
  message: string
}

interface ConversationTranscriptEntry {
  role: string
  message: string
  time_in_call_secs?: number
}

interface ConversationStatus {
  status: string
  transcript: ConversationTranscriptEntry[]
  metadata?: Record<string, unknown>
  analysis?: Record<string, unknown>
}

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('ELEVENLABS_API_KEY not set')
  return key
}

function getPhoneNumberId(): string {
  const id = process.env.ELEVENLABS_PHONE_NUMBER_ID
  if (!id) throw new Error('ELEVENLABS_PHONE_NUMBER_ID not set')
  return id
}

// Create a temporary agent with a specific persona for a phishing simulation call
export async function createCallAgent(opts: {
  sessionId: string
  personaName: string
  systemPrompt: string
  firstMessage: string
  voiceId?: string
}): Promise<string> {
  const apiKey = getApiKey()

  const body = {
    name: `parable-${opts.sessionId.substring(0, 8)}`,
    conversation_config: {
      agent: {
        prompt: {
          prompt: opts.systemPrompt,
        },
        first_message: opts.firstMessage,
        language: 'en',
      },
      tts: {
        voice_id: opts.voiceId || 'cjVigY5qzO86Huf0OWal', // Eric - Smooth, Trustworthy
      },
    },
  }

  console.log(`[ELEVENLABS] Creating agent for session ${opts.sessionId}...`)

  const response = await fetch(`${ELEVENLABS_API}/convai/agents/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to create ElevenLabs agent: ${response.status} ${text}`)
  }

  const data = await response.json()
  const agentId = data.agent_id

  console.log(`[ELEVENLABS] Agent created: ${agentId}`)
  return agentId
}

// Make an outbound call using the ElevenLabs agent
export async function makeOutboundCall(opts: {
  agentId: string
  toNumber: string
  sessionId: string
  targetName?: string
}): Promise<ElevenLabsCallResult> {
  const apiKey = getApiKey()
  const phoneNumberId = getPhoneNumberId()

  const body: Record<string, unknown> = {
    agent_id: opts.agentId,
    agent_phone_number_id: phoneNumberId,
    to_number: opts.toNumber,
  }

  // Pass dynamic variables for personalization
  if (opts.targetName || opts.sessionId) {
    body.conversation_initiation_client_data = {
      dynamic_variables: {
        target_name: opts.targetName || 'there',
        session_id: opts.sessionId,
      },
    }
  }

  console.log(`[ELEVENLABS] Initiating outbound call to ${opts.toNumber}...`)

  const response = await fetch(`${ELEVENLABS_API}/convai/twilio/outbound-call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to initiate call: ${response.status} ${text}`)
  }

  const result: ElevenLabsCallResult = await response.json()
  console.log(`[ELEVENLABS] Call initiated — conversation_id: ${result.conversation_id}, callSid: ${result.callSid}`)

  return result
}

// Poll for conversation completion and fetch transcript
export async function waitForConversation(conversationId: string, timeoutMs = 300_000): Promise<ConversationStatus> {
  const apiKey = getApiKey()
  const startTime = Date.now()
  const pollInterval = 5_000

  console.log(`[ELEVENLABS] Waiting for conversation ${conversationId} to complete...`)

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${ELEVENLABS_API}/convai/conversations/${conversationId}`, {
      headers: { 'xi-api-key': apiKey },
    })

    if (!response.ok) {
      console.error(`[ELEVENLABS] Failed to fetch conversation: ${response.status}`)
      await sleep(pollInterval)
      continue
    }

    const data = await response.json()
    const status = data.status

    if (status === 'done' || status === 'failed' || status === 'timeout') {
      console.log(`[ELEVENLABS] Conversation ${conversationId} ended with status: ${status}`)

      const transcript: ConversationTranscriptEntry[] = (data.transcript || []).map((entry: Record<string, unknown>) => ({
        role: entry.role as string,
        message: entry.message as string,
        time_in_call_secs: entry.time_in_call_secs as number | undefined,
      }))

      return {
        status,
        transcript,
        metadata: data.metadata,
        analysis: data.analysis,
      }
    }

    await sleep(pollInterval)
  }

  console.log(`[ELEVENLABS] Conversation ${conversationId} timed out`)
  return { status: 'timeout', transcript: [] }
}

// Delete a temporary agent after the call
export async function deleteAgent(agentId: string): Promise<void> {
  const apiKey = getApiKey()

  try {
    await fetch(`${ELEVENLABS_API}/convai/agents/${agentId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': apiKey },
    })
    console.log(`[ELEVENLABS] Deleted agent ${agentId}`)
  } catch {
    console.error(`[ELEVENLABS] Failed to delete agent ${agentId}`)
  }
}

// Format transcript into readable text for the agent loop
export function formatTranscript(transcript: ConversationTranscriptEntry[]): string {
  return transcript
    .map((entry) => `${entry.role === 'agent' ? 'Agent' : 'Target'}: ${entry.message}`)
    .join('\n')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
