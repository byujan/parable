import { createAdminClient } from '@/lib/supabase/admin'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured logger that writes to both console and the campaign_logs table.
 * Allows campaign activity to be visible in the UI.
 */
export class AgentLogger {
  private campaignId: string | null
  private sessionId: string
  private organizationId: string | null

  constructor(sessionId: string, campaignId?: string, organizationId?: string) {
    this.sessionId = sessionId
    this.campaignId = campaignId || null
    this.organizationId = organizationId || null
  }

  async info(message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log('info', message, metadata)
  }

  async warn(message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log('warn', message, metadata)
  }

  async error(message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log('error', message, metadata)
  }

  private async log(level: LogLevel, message: string, metadata?: Record<string, unknown>): Promise<void> {
    const prefix = `[AGENT:${this.sessionId.substring(0, 8)}]`
    const logMsg = `${prefix} ${message}`

    // Console output
    switch (level) {
      case 'error':
        console.error(logMsg, metadata || '')
        break
      case 'warn':
        console.warn(logMsg, metadata || '')
        break
      default:
        console.log(logMsg, metadata || '')
    }

    // Persist to database (best effort — don't block on failures)
    try {
      const supabase = createAdminClient()
      await supabase.from('campaign_logs').insert({
        campaign_id: this.campaignId,
        session_id: this.sessionId,
        level,
        message,
        metadata: metadata || null,
        organization_id: this.organizationId,
      })
    } catch {
      // Don't let logging failures affect the agent
    }
  }
}
