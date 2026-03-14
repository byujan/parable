import {
  AgentSession,
  AgentAction,
  Signal,
  AgentConfig,
  AgentTarget,
  ScenarioType,
  DEFAULT_AGENT_CONFIG,
} from './types'
import { AgentReactor } from './reactor'
import { ChannelProvider } from '@/lib/channels/types'
import { getChannelProvider } from '@/lib/channels'
import { saveSession, updateSessionStatus } from './session-store'
import { registerExecutor, unregisterExecutor } from './session-manager'
import { consumeSignals } from './signal-bus'
import { AgentLogger } from './logger'
import { v4 as uuidv4 } from 'uuid'
import { injectTracking } from './tracking'
import { createAdminClient } from '@/lib/supabase/admin'

export type SignalHandler = (session: AgentSession) => void

export class AgentExecutor {
  private reactor: AgentReactor
  private channels: ChannelProvider
  private session: AgentSession
  private logger: AgentLogger
  private waitTimer: ReturnType<typeof setTimeout> | null = null
  private onSignalNeeded: ((session: AgentSession) => Promise<Signal | null>) | null = null
  private pendingSignalResolve: ((signal: Signal | null) => void) | null = null
  private consecutiveErrors = 0

  constructor(
    targets: AgentTarget | AgentTarget[],
    scenario: ScenarioType,
    config: Partial<AgentConfig> = {},
  ) {
    const fullConfig = { ...DEFAULT_AGENT_CONFIG, ...config }
    const targetArray = Array.isArray(targets) ? targets : [targets]

    this.session = {
      id: uuidv4(),
      targets: targetArray,
      scenario,
      status: 'running',
      actions: [],
      signals: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config: fullConfig,
    }

    this.reactor = new AgentReactor(fullConfig.ai_provider, fullConfig.ai_model)
    this.channels = getChannelProvider(fullConfig.mock_channels)
    this.logger = new AgentLogger(this.session.id, fullConfig.campaign_id, fullConfig.organization_id)
  }

  getSession(): AgentSession {
    return this.session
  }

  getSessionId(): string {
    return this.session.id
  }

  /**
   * Resume from an existing session (e.g. after pause/restart).
   * Replaces the internal session state with the loaded one.
   */
  resumeFrom(session: AgentSession): void {
    this.session = { ...session, status: 'running' }
    this.logger = new AgentLogger(session.id, session.config.campaign_id, session.config.organization_id)
  }

  setSignalProvider(provider: (session: AgentSession) => Promise<Signal | null>): void {
    this.onSignalNeeded = provider
  }

  async pushSignal(signal: Signal): Promise<void> {
    this.session.signals.push(signal)
    await saveSession(this.session)

    if (this.pendingSignalResolve) {
      if (this.waitTimer) {
        clearTimeout(this.waitTimer)
        this.waitTimer = null
      }
      const resolve = this.pendingSignalResolve
      this.pendingSignalResolve = null
      resolve(signal)
      return
    }

    await this.step(signal)
  }

  async run(): Promise<AgentSession> {
    const targetNames = this.session.targets.map(t => `${t.first_name} ${t.last_name}`).join(', ')
    await this.logger.info('Session started', {
      targets: targetNames,
      scenario: this.session.scenario,
      channels: this.session.config.allowed_channels,
      mock: this.session.config.mock_channels,
      max_actions: this.session.config.max_actions,
    })

    registerExecutor(this)
    await saveSession(this.session)

    const startSignal: Signal = {
      type: 'session_started',
      timestamp: new Date().toISOString(),
    }
    this.session.signals.push(startSignal)

    await this.step(startSignal)

    while (this.session.status === 'running') {
      const signal = await this.waitForSignal()
      if (!signal) {
        this.session.status = 'completed'
        break
      }
      if (!this.session.signals.includes(signal)) {
        this.session.signals.push(signal)
      }
      await saveSession(this.session)
      await this.step(signal)
    }

    unregisterExecutor(this.session.id)
    await saveSession(this.session)
    await this.logger.info(`Session ended with status: ${this.session.status}`, {
      total_actions: this.session.actions.length,
      total_signals: this.session.signals.length,
    })

    // Update the linked campaign status to match
    if (this.session.config.campaign_id) {
      try {
        const supabase = createAdminClient()
        const campaignStatus = this.session.status === 'completed' ? 'completed'
          : this.session.status === 'stopped' ? 'cancelled'
          : this.session.status === 'failed' ? 'cancelled'
          : 'completed'
        await supabase
          .from('campaigns')
          .update({
            status: campaignStatus,
            completed_at: new Date().toISOString(),
          })
          .eq('id', this.session.config.campaign_id)
      } catch (err) {
        await this.logger.error('Failed to update campaign status', { error: String(err) })
      }
    }

    return this.session
  }

  private async step(signal: Signal): Promise<void> {
    if (this.session.status !== 'running') return

    if (this.session.actions.length >= this.session.config.max_actions) {
      await this.logger.info('Max actions reached — ending session', {
        max_actions: this.session.config.max_actions,
      })
      this.session.status = 'completed'
      await updateSessionStatus(this.session.id, 'completed')
      return
    }

    try {
      await this.logger.info(`Signal received: ${signal.type}`, {
        signal_type: signal.type,
        signal_data: signal.data || null,
      })

      const decision = await this.reactor.decide(this.session, signal)
      const action = this.reactor.decisionToAction(decision)

      const target = this.session.targets[action.target_index]
      const targetLabel = target ? `${target.first_name} ${target.last_name}` : `target[${action.target_index}]`

      await this.logger.info(`AI decision: ${decision.action} → ${targetLabel}`, {
        action_type: decision.action,
        target_index: action.target_index,
        target_name: targetLabel,
        reasoning: decision.reasoning,
        action_id: action.id,
      })

      const result = await this.executeAction(action)
      action.result = result

      this.session.actions.push(action)
      await saveSession(this.session)

      // Reset error counter on success
      this.consecutiveErrors = 0

      if (action.channel === 'end') {
        await this.logger.info(`Campaign ending: ${action.content}`, {
          action_id: action.id,
          total_actions: this.session.actions.length,
        })
        this.session.status = 'completed'
        await updateSessionStatus(this.session.id, 'completed')
        return
      }

      if (action.channel === 'wait') {
        const waitMs = decision.wait_seconds
          ? (this.session.config.compressed_timing ? Math.min(decision.wait_seconds * 1000, 10_000) : decision.wait_seconds * 1000)
          : this.session.config.wait_timeout_ms
        await this.logger.info(`Waiting ${waitMs / 1000}s for response`, {
          action_id: action.id,
          wait_seconds: waitMs / 1000,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      // Track consecutive failures — fail the session after 3 in a row
      this.consecutiveErrors = (this.consecutiveErrors || 0) + 1

      await this.logger.error(`Step error (${this.consecutiveErrors}/3): ${message}`, {
        consecutive_errors: this.consecutiveErrors,
        signal_type: signal.type,
      })

      if (this.consecutiveErrors >= 3) {
        await this.logger.error('Too many consecutive errors — failing session')
        this.session.status = 'failed'
        await updateSessionStatus(this.session.id, 'failed')
        return
      }

      // Push a no_response signal to retry decision on next loop iteration
      // instead of silently dropping the step
    }
  }

  private async executeAction(action: AgentAction): Promise<Record<string, unknown>> {
    const target = this.session.targets[action.target_index]
    if (!target && action.channel !== 'wait' && action.channel !== 'end') {
      await this.logger.warn(`Invalid target_index: ${action.target_index}`, {
        action_id: action.id,
        channel: action.channel,
      })
      return { error: `Invalid target_index: ${action.target_index}` }
    }

    switch (action.channel) {
      case 'email': {
        const sendingDomain = process.env.RESEND_SENDING_DOMAIN
        // Use the AI-suggested sender_email if it matches our domain, otherwise use a fixed noreply address
        const aiSenderEmail = action.sender_email || ''
        const fromEmail = sendingDomain
          ? (aiSenderEmail.endsWith(`@${sendingDomain}`) ? aiSenderEmail : `noreply@${sendingDomain}`)
          : 'onboarding@resend.dev'

        // Inject click tracking links and open pixel if we have a token for this recipient
        let emailHtml = action.content
        const trackingToken = this.session.config.target_tokens?.[action.target_index]
        if (trackingToken) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          emailHtml = injectTracking(emailHtml, appUrl, trackingToken)
        }

        await this.logger.info(`Sending email to ${target.email}`, {
          action_id: action.id,
          channel: 'email',
          target_index: action.target_index,
          target_email: target.email,
          from_name: action.sender_name,
          from_email: fromEmail,
          subject: action.subject,
          tracking_enabled: !!trackingToken,
        })

        const result = await this.channels.sendEmail({
          to: target.email,
          from_email: fromEmail,
          from_name: action.sender_name || 'IT Security',
          subject: action.subject || 'Important Notice',
          html_body: emailHtml,
          reply_to: process.env.RESEND_INBOUND_ADDRESS,
        })

        const success = (result as unknown as Record<string, unknown>).success
        if (success) {
          await this.logger.info(`Email delivered to ${target.email}`, {
            action_id: action.id,
            channel: 'email',
            target_index: action.target_index,
            provider_id: (result as unknown as Record<string, unknown>).provider_id,
          })
        } else {
          await this.logger.error(`Email failed to ${target.email}`, {
            action_id: action.id,
            channel: 'email',
            target_index: action.target_index,
            error: (result as unknown as Record<string, unknown>).error,
          })
        }

        return result as unknown as Record<string, unknown>
      }

      case 'sms': {
        await this.logger.info(`Sending SMS to ${target.phone}`, {
          action_id: action.id,
          channel: 'sms',
          target_index: action.target_index,
          target_phone: target.phone,
          message_preview: action.content.substring(0, 100),
        })

        const result = await this.channels.sendSms({
          to: target.phone,
          body: action.content,
        })

        const success = (result as unknown as Record<string, unknown>).success
        if (success) {
          await this.logger.info(`SMS sent to ${target.phone}`, {
            action_id: action.id,
            channel: 'sms',
            target_index: action.target_index,
            provider_id: (result as unknown as Record<string, unknown>).provider_id,
          })
        } else {
          await this.logger.error(`SMS failed to ${target.phone}`, {
            action_id: action.id,
            channel: 'sms',
            target_index: action.target_index,
            error: (result as unknown as Record<string, unknown>).error,
          })
        }

        return result as unknown as Record<string, unknown>
      }

      case 'voice': {
        await this.logger.info(`Making voice call to ${target.phone}`, {
          action_id: action.id,
          channel: 'voice',
          target_index: action.target_index,
          target_phone: target.phone,
        })

        const { buildSystemPrompt } = await import('./prompts')
        const voiceSystemPrompt = buildSystemPrompt(this.session)

        const result = await this.channels.makeCall({
          to: target.phone,
          opening_script: action.content,
          session_id: this.session.id,
          system_prompt: voiceSystemPrompt,
          target_name: `${target.first_name} ${target.last_name}`,
        })

        const success = (result as unknown as Record<string, unknown>).success
        if (success) {
          await this.logger.info(`Voice call connected to ${target.phone}`, {
            action_id: action.id,
            channel: 'voice',
            target_index: action.target_index,
            provider_id: (result as unknown as Record<string, unknown>).provider_id,
          })
        } else {
          await this.logger.error(`Voice call failed to ${target.phone}`, {
            action_id: action.id,
            channel: 'voice',
            target_index: action.target_index,
            error: (result as unknown as Record<string, unknown>).error,
          })
        }

        return result as unknown as Record<string, unknown>
      }

      case 'wait':
      case 'end':
        return { status: action.channel }

      default:
        return { error: `Unknown channel: ${action.channel}` }
    }
  }

  private async waitForSignal(): Promise<Signal | null> {
    if (this.onSignalNeeded) {
      return this.onSignalNeeded(this.session)
    }

    const pollIntervalMs = 3_000
    const timeoutMs = this.session.config.wait_timeout_ms

    return new Promise((resolve) => {
      const startTime = Date.now()

      const poll = async () => {
        if (this.session.status !== 'running') {
          resolve(null)
          return
        }

        const signals = await consumeSignals(this.session.id)
        if (signals.length > 0) {
          // Fire-and-forget — don't block signal processing on log writes
          this.logger.info(`Received ${signals.length} signal(s) from webhook`, {
            signal_types: signals.map(s => s.type),
          })
          const first = signals[0]
          for (let i = 1; i < signals.length; i++) {
            this.session.signals.push(signals[i])
          }
          resolve(first)
          return
        }

        if (Date.now() - startTime > timeoutMs) {
          resolve({
            type: 'no_response',
            timestamp: new Date().toISOString(),
          })
          return
        }

        this.waitTimer = setTimeout(poll, pollIntervalMs)
      }

      poll()
    })
  }

  stop(): void {
    if (this.waitTimer) {
      clearTimeout(this.waitTimer)
      this.waitTimer = null
    }
    if (this.pendingSignalResolve) {
      this.pendingSignalResolve(null)
      this.pendingSignalResolve = null
    }
    this.session.status = 'stopped'
    updateSessionStatus(this.session.id, 'stopped')
    unregisterExecutor(this.session.id)
    this.logger.info('Session stopped by admin')
  }
}
