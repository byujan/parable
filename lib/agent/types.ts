// ============================================================
// Phishing AI Agent Types
// ============================================================

export type ChannelType = 'email' | 'sms' | 'voice'

export type SignalType =
  | 'email_opened'
  | 'email_clicked'
  | 'email_submitted'
  | 'email_reported'
  | 'email_reply'
  | 'sms_reply'
  | 'voice_answered'
  | 'voice_keypress'
  | 'voice_speech'
  | 'voice_voicemail'
  | 'voice_no_answer'
  | 'no_response'     // timeout with no reaction
  | 'session_started'

export interface Signal {
  type: SignalType
  timestamp: string
  data?: Record<string, unknown>
}

export interface AgentAction {
  id: string
  channel: ChannelType | 'wait' | 'end'
  target_index: number          // which recipient this action targets
  content: string               // email HTML, SMS text, voice script, or wait reason
  subject?: string              // email subject
  sender_name?: string          // email sender display name
  sender_email?: string         // email sender address
  reasoning: string             // AI's reasoning for this action
  timestamp: string
  result?: Record<string, unknown>
}

export interface AgentTarget {
  email: string
  phone: string
  first_name: string
  last_name: string
  company: string
  department?: string
  job_title?: string
  notes?: string
}

export type ScenarioType =
  | 'open_link'
  | 'download_file'
  | 'enter_credentials'

export type AgentSessionStatus = 'running' | 'pending' | 'completed' | 'stopped' | 'failed'

export interface AgentSession {
  id: string
  targets: AgentTarget[]        // all recipients in this campaign
  scenario: ScenarioType
  status: AgentSessionStatus
  actions: AgentAction[]
  signals: Signal[]
  created_at: string
  updated_at: string
  config: AgentConfig
}

export type AIProviderType = 'ollama' | 'claude'

export interface AgentConfig {
  max_actions: number            // safety limit (total across all recipients)
  wait_timeout_ms: number        // how long to wait before firing no_response
  mock_channels: boolean         // use console-log mocks
  compressed_timing: boolean     // compress delays for testing
  landing_page_url?: string      // URL for credential harvest pages
  ai_provider: AIProviderType    // which AI backend to use
  ai_model: string               // model name for the chosen provider
  allowed_channels: ChannelType[] // which channels the agent can use
  campaign_id?: string           // linked campaign ID for logging
  organization_id?: string       // org scope for multi-tenancy
  target_tokens?: Record<number, string>  // target_index → unique tracking token
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  max_actions: 5,
  wait_timeout_ms: 60_000,
  mock_channels: true,
  compressed_timing: true,
  landing_page_url: 'http://localhost:3000/phish/demo',
  ai_provider: 'claude',
  ai_model: 'claude-sonnet-4-20250514',
  allowed_channels: ['email', 'sms', 'voice'],
}

// What the AI returns when deciding the next move
export interface AIDecision {
  action: 'send_email' | 'send_sms' | 'make_call' | 'wait' | 'end'
  target_index: number           // which recipient (0-based index)
  content: string
  subject?: string
  sender_name?: string
  sender_email?: string
  reasoning: string
  wait_seconds?: number
}
