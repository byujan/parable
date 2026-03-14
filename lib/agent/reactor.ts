import {
  AgentSession,
  Signal,
  AIDecision,
  AgentAction,
} from './types'
import { AIBackend, AIBackendType, createAIBackend } from './ai-backend'
import { buildSystemPrompt, buildDecisionPrompt } from './prompts'
import { v4 as uuidv4 } from 'uuid'

const MAX_RETRIES = 2

export class AgentReactor {
  private backend: AIBackend

  constructor(backend: AIBackend)
  constructor(backendType: AIBackendType, model?: string)
  constructor(backendOrType: AIBackend | AIBackendType, model?: string) {
    if (typeof backendOrType === 'string') {
      this.backend = createAIBackend(backendOrType, model)
    } else {
      this.backend = backendOrType
    }
  }

  async decide(session: AgentSession, signal: Signal): Promise<AIDecision> {
    const systemPrompt = buildSystemPrompt(session)
    const userPrompt = buildDecisionPrompt(session, signal)

    let lastError = ''

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Exponential backoff on retries
      if (attempt > 0) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }

      const prompt = attempt === 0
        ? userPrompt
        : `${userPrompt}\n\nIMPORTANT: Your previous response was invalid: ${lastError}\nYou MUST include ALL required fields including "target_index" (0 to ${session.targets.length - 1}). For send_email, include: "action", "target_index", "content" (full HTML body), "subject", "sender_name", "sender_email", "reasoning".`

      const raw = await this.backend.chat(systemPrompt, prompt)

      let decision: AIDecision
      try {
        decision = JSON.parse(raw)
      } catch {
        // Use a balanced brace matcher instead of greedy regex
        const jsonMatch = extractJsonObject(raw)
        if (jsonMatch) {
          try {
            decision = JSON.parse(jsonMatch)
          } catch {
            lastError = 'Response was not valid JSON'
            continue
          }
        } else {
          lastError = `Not JSON: ${raw.substring(0, 100)}`
          continue
        }
      }

      const validActions = ['send_email', 'send_sms', 'make_call', 'wait', 'end']
      if (!decision.action || !validActions.includes(decision.action)) {
        lastError = `Invalid or missing action: ${decision.action}`
        continue
      }

      // Validate target_index for non-wait/end actions
      if (decision.action !== 'wait' && decision.action !== 'end') {
        if (decision.target_index === undefined || decision.target_index === null) {
          decision.target_index = 0
        }
        if (decision.target_index < 0 || decision.target_index >= session.targets.length) {
          lastError = `Invalid target_index ${decision.target_index}. Must be 0 to ${session.targets.length - 1}`
          continue
        }
      } else {
        // Default target_index for wait/end
        if (decision.target_index === undefined) decision.target_index = 0
      }

      // For send_email, content is the HTML body
      if (decision.action === 'send_email' && !decision.content) {
        const alt = decision as unknown as Record<string, unknown>
        const body = alt.body || alt.html_body || alt.email_body || alt.html
        if (body && typeof body === 'string') {
          decision.content = body
        } else {
          lastError = 'Missing "content" field (the email HTML body)'
          continue
        }
      }

      if (!decision.content && decision.action !== 'end') {
        lastError = 'Missing "content" field'
        continue
      }

      if (!decision.content) decision.content = ''
      if (!decision.reasoning) decision.reasoning = ''

      return decision
    }

    throw new Error(`AI failed after ${MAX_RETRIES + 1} attempts. Last error: ${lastError}`)
  }

  decisionToAction(decision: AIDecision): AgentAction {
    const channelMap: Record<string, AgentAction['channel']> = {
      send_email: 'email',
      send_sms: 'sms',
      make_call: 'voice',
      wait: 'wait',
      end: 'end',
    }

    return {
      id: uuidv4(),
      channel: channelMap[decision.action],
      target_index: decision.target_index,
      content: decision.content,
      subject: decision.subject,
      sender_name: decision.sender_name,
      sender_email: decision.sender_email,
      reasoning: decision.reasoning || '',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Extract the first balanced JSON object from a string.
 * Handles cases where AI wraps the JSON in explanation text.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < text.length; i++) {
    const char = text[i]

    if (escape) {
      escape = false
      continue
    }

    if (char === '\\' && inString) {
      escape = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') depth++
    else if (char === '}') {
      depth--
      if (depth === 0) {
        return text.substring(start, i + 1)
      }
    }
  }

  return null
}
