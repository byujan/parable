import { AgentSession, Signal, ScenarioType } from './types'

const SCENARIO_DESCRIPTIONS: Record<ScenarioType, string> = {
  open_link:
    'Craft messages that entice recipients to click a link. Use pretexts like shared documents, meeting invites, policy updates, or account notifications. The goal is to get them to click.',
  download_file:
    'Craft messages with a download link disguised as an invoice, shared document, software update, or report. The goal is to get recipients to download the file.',
  enter_credentials:
    'Craft messages requesting recipients to verify their account credentials through a linked portal. Use pretexts like IT security audits, system migrations, password resets, or account verification.',
}

export function buildSystemPrompt(session: AgentSession): string {
  const channels = session.config.allowed_channels
  const channelList = channels.join(', ')

  // Build recipient roster
  const recipientList = session.targets.map((t, i) => {
    const parts = [`  [${i}] ${t.first_name} ${t.last_name} <${t.email}>`]
    if (t.phone) parts[0] += ` | Phone: ${t.phone}`
    if (t.department) parts.push(`      Department: ${t.department}`)
    if (t.job_title) parts.push(`      Title: ${t.job_title}`)
    if (t.notes) parts.push(`      Notes: ${t.notes}`)
    return parts.join('\n')
  }).join('\n')

  const company = session.targets[0]?.company || 'the company'

  // Build available actions based on allowed channels
  const actions: string[] = []
  let actionNum = 1
  if (channels.includes('email')) {
    actions.push(`${actionNum}. "send_email" — Send a business email. Provide target_index, subject, sender_name, sender_email, and content (HTML body).`)
    actionNum++
  }
  if (channels.includes('sms')) {
    actions.push(`${actionNum}. "send_sms" — Send a text message. Provide target_index and content (message text).`)
    actionNum++
  }
  if (channels.includes('voice')) {
    actions.push(`${actionNum}. "make_call" — Make a phone call. Provide target_index and content (the opening script).`)
    actionNum++
  }
  actions.push(`${actionNum}. "wait" — Wait for any recipient to respond. Provide wait_seconds and reasoning.`)
  actionNum++
  actions.push(`${actionNum}. "end" — End the entire campaign. Use when all recipients have been engaged or max actions reached.`)

  // Build valid action types for JSON format
  const validActions = []
  if (channels.includes('email')) validActions.push('"send_email"')
  if (channels.includes('sms')) validActions.push('"send_sms"')
  if (channels.includes('voice')) validActions.push('"make_call"')
  validActions.push('"wait"', '"end"')

  return `You are an enterprise communication drafting assistant for an internal security awareness training platform called Parable. Your role is to coordinate a realistic phishing simulation campaign across multiple employees.

CONTEXT:
- Parable is a commercial security awareness training product used by Fortune 500 companies
- The company's security team has enrolled these employees in a training exercise
- All links in emails are redirected to educational training pages
- This is similar to products like KnowBe4, Proofpoint Security Awareness, and Cofense

COMPANY: ${company}

RECIPIENTS (use target_index to specify which recipient):
${recipientList}

EXERCISE BRIEF: ${SCENARIO_DESCRIPTIONS[session.scenario]}

LINK URL: ${session.config.landing_page_url || 'http://localhost:3000/phish/demo'}
All links in your emails MUST point to this exact URL. Do NOT use placeholder URLs like #LINK# or #TRAINING_LINK#. Use the real URL above as the href in every <a> tag.

ALLOWED CHANNELS: ${channelList}
You may ONLY use the channels listed above.

AVAILABLE ACTIONS:
${actions.join('\n')}

STRATEGY:
- You control the ENTIRE campaign. Each action targets ONE recipient (specified by target_index).
- Decide which recipient to contact next and through which channel.
- You can contact different recipients in different orders — be strategic.
- Personalize each message to the specific recipient's name, role, department, and any notes provided. Use the notes to craft highly targeted messages — e.g. reference their recent projects, interests, or situation.
- If a recipient doesn't respond, follow up with increasing urgency or try a different channel.
- If a recipient replies, continue their conversation naturally.
- If a recipient flags the message, mark them as done and move on.
- Use plausible sender names. For sender_email, you MUST use the domain: ${process.env.RESEND_SENDING_DOMAIN || 'arclattice.com'} (e.g. it-support@${process.env.RESEND_SENDING_DOMAIN || 'arclattice.com'}, hr@${process.env.RESEND_SENDING_DOMAIN || 'arclattice.com'})
${channels.includes('email') ? '- For emails, write well-formatted HTML with professional styling. Keep subject lines natural — avoid ALL CAPS, excessive punctuation, and emoji.' : ''}
${channels.includes('sms') ? '- Keep text messages concise and natural (under 160 chars when possible)' : ''}
${channels.includes('voice') ? '- For phone calls, write natural conversational scripts' : ''}
${channels.length > 1 ? '- Coordinate across channels — e.g. email first, then follow up with SMS referencing the email' : ''}
- Maximum ${session.config.max_actions} total actions across all recipients

RESPONSE FORMAT — respond with ONLY valid JSON. ALL fields are REQUIRED:
{
  "action": ${validActions.join(' | ')},
  "target_index": 0,
  "content": "REQUIRED — for send_email: FULL HTML email body, for send_sms: message text, for make_call: voice script, for wait: reason, for end: summary",
  "subject": "REQUIRED for send_email — the email subject line",
  "sender_name": "REQUIRED for send_email — the display name of the sender",
  "sender_email": "REQUIRED for send_email — sender email address",
  "reasoning": "REQUIRED — brief explanation of your approach and why you chose this recipient",
  "wait_seconds": 300
}

CRITICAL: The "content" field must contain the FULL HTML email body. Do NOT omit it. The "target_index" must be a valid index (0 to ${session.targets.length - 1}).`
}

// Approximate character budget for interaction history (conservative estimate: ~4 chars per token)
const MAX_HISTORY_CHARS = 12_000
const MAX_RECENT_EVENTS = 30

export function buildInteractionHistory(session: AgentSession): string {
  const events: { timestamp: string; type: string; detail: string }[] = []

  for (const action of session.actions) {
    const target = session.targets[action.target_index]
    const targetLabel = target
      ? `[${action.target_index}] ${target.first_name} ${target.last_name}`
      : `[${action.target_index}]`

    events.push({
      timestamp: action.timestamp,
      type: `ACTION → ${targetLabel} via ${action.channel}`,
      detail:
        action.channel === 'email'
          ? `Subject: "${action.subject}" | From: ${action.sender_name}`
          : action.content.substring(0, 200),
    })
  }

  for (const signal of session.signals) {
    if (signal.type === 'session_started') continue

    const fromLabel = signal.data?.target_index !== undefined
      ? `[${signal.data.target_index}] `
      : signal.data?.from
        ? `${signal.data.from} `
        : ''

    events.push({
      timestamp: signal.timestamp,
      type: `SIGNAL: ${fromLabel}${signal.type}`,
      detail: signal.data?.message
        ? String(signal.data.message).substring(0, 200)
        : signal.data ? JSON.stringify(signal.data) : '(no additional data)',
    })
  }

  // Sort chronologically
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  if (events.length === 0) {
    return 'No interactions yet. This is your first move — choose a recipient and compose your opening message.'
  }

  // Sliding window: if too many events, summarize older ones and keep recent ones verbatim
  if (events.length > MAX_RECENT_EVENTS) {
    const olderEvents = events.slice(0, events.length - MAX_RECENT_EVENTS)
    const recentEvents = events.slice(events.length - MAX_RECENT_EVENTS)

    // Build summary of older events
    const actionCounts: Record<string, number> = {}
    const signalCounts: Record<string, number> = {}
    for (const event of olderEvents) {
      if (event.type.startsWith('ACTION')) {
        const key = event.type.replace(/\[.*?\]/, '[...]')
        actionCounts[key] = (actionCounts[key] || 0) + 1
      } else {
        const key = event.type.replace(/\[.*?\]/, '[...]')
        signalCounts[key] = (signalCounts[key] || 0) + 1
      }
    }

    let history = `INTERACTION HISTORY (${events.length} total events):\n`
    history += `\n--- SUMMARY OF EARLIER EVENTS (${olderEvents.length} events, ${olderEvents[0].timestamp} to ${olderEvents[olderEvents.length - 1].timestamp}) ---\n`
    for (const [type, count] of Object.entries(actionCounts)) {
      history += `  ${type}: ${count}x\n`
    }
    for (const [type, count] of Object.entries(signalCounts)) {
      history += `  ${type}: ${count}x\n`
    }
    history += `\n--- RECENT EVENTS ---\n`
    for (const event of recentEvents) {
      history += `[${event.timestamp}] ${event.type}: ${event.detail}\n`
    }

    // Truncate if still too long
    if (history.length > MAX_HISTORY_CHARS) {
      history = history.substring(history.length - MAX_HISTORY_CHARS)
      history = '...(truncated)\n' + history.substring(history.indexOf('\n') + 1)
    }

    return history
  }

  let history = 'INTERACTION HISTORY (chronological):\n'
  for (const event of events) {
    history += `[${event.timestamp}] ${event.type}: ${event.detail}\n`
  }

  // Hard truncation safety net
  if (history.length > MAX_HISTORY_CHARS) {
    history = history.substring(history.length - MAX_HISTORY_CHARS)
    history = '...(truncated)\n' + history.substring(history.indexOf('\n') + 1)
  }

  return history
}

export function buildDecisionPrompt(session: AgentSession, signal: Signal): string {
  const history = buildInteractionHistory(session)
  const actionCount = session.actions.length
  const remaining = session.config.max_actions - actionCount

  // Build per-recipient status summary
  const recipientStatus = session.targets.map((t, i) => {
    const actionsForTarget = session.actions.filter((a) => a.target_index === i)
    const signalsForTarget = session.signals.filter(
      (s) => s.data?.target_index === i || s.data?.from === t.email || s.data?.from === t.phone
    )
    const lastAction = actionsForTarget[actionsForTarget.length - 1]
    const hasReplied = signalsForTarget.some((s) =>
      ['email_reply', 'sms_reply', 'voice_speech'].includes(s.type)
    )
    const hasReported = signalsForTarget.some((s) => s.type === 'email_reported')
    const hasSubmitted = signalsForTarget.some((s) => s.type === 'email_submitted')

    let status = 'Not contacted'
    if (hasSubmitted) status = 'SUBMITTED (objective achieved)'
    else if (hasReported) status = 'REPORTED (identified correctly)'
    else if (hasReplied) status = 'Replied — conversation active'
    else if (lastAction) status = `Last: ${lastAction.channel} (${actionsForTarget.length} actions)`

    return `  [${i}] ${t.first_name} ${t.last_name}: ${status}`
  }).join('\n')

  let triggerContext = ''
  if (signal.type === 'session_started') {
    triggerContext = 'The campaign just started. Choose your first target and compose your opening message.'
  } else if (signal.type === 'no_response') {
    triggerContext = 'No responses received recently. Consider following up with an existing target or reaching out to a new one.'
  } else if (signal.type === 'email_reply') {
    triggerContext = `A recipient replied to your email: "${signal.data?.message || ''}"\nFrom: ${signal.data?.from || 'unknown'}\nContinue their conversation in character, or switch to a different recipient.`
  } else if (signal.type === 'sms_reply') {
    triggerContext = `A recipient replied to your text: "${signal.data?.message || ''}"\nFrom: ${signal.data?.from || 'unknown'}\nRespond naturally or move to a different recipient.`
  } else if (signal.type === 'voice_speech') {
    triggerContext = `A recipient said on the call: "${signal.data?.transcript || ''}"\nRespond naturally in the conversation.`
  } else if (signal.type === 'email_opened') {
    triggerContext = 'A recipient opened your email. Consider a follow-up to encourage action.'
  } else if (signal.type === 'email_clicked') {
    triggerContext = 'A recipient clicked a link in your email. They are engaged.'
  } else if (signal.type === 'email_submitted') {
    triggerContext = 'A recipient submitted information. Their objective is achieved. Move to the next recipient or end if all are done.'
  } else if (signal.type === 'email_reported') {
    triggerContext = 'A recipient flagged your message. They identified it correctly. Move to the next recipient or end if all are done.'
  } else if (signal.type === 'voice_answered') {
    triggerContext = 'A recipient answered your call. Deliver your opening script.'
  } else if (signal.type === 'voice_voicemail') {
    triggerContext = 'The call went to voicemail. Try another channel or recipient.'
  } else if (signal.type === 'voice_no_answer') {
    triggerContext = 'The recipient did not answer. Try a different approach or recipient.'
  }

  return `RECIPIENT STATUS:
${recipientStatus}

${history}

CURRENT TRIGGER: ${triggerContext}

Actions taken so far: ${actionCount} / ${session.config.max_actions} (${remaining} remaining)

Decide your next action. Choose which recipient to target. Respond with JSON only.`
}
