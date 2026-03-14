#!/usr/bin/env npx tsx
/**
 * Interactive CLI for testing the Phishing AI Agent.
 *
 * Email only (live):
 *   npx tsx scripts/run-agent.ts --live --channels email --email "you@example.com" --name "Your Name" --company "Acme Corp"
 *
 * All channels (live):
 *   npx tsx scripts/run-agent.ts --live --email "you@example.com" --phone "+1234567890" --name "Your Name" --company "Acme Corp"
 *
 * Mock mode (console only, default):
 *   npx tsx scripts/run-agent.ts --name "Your Name" --email "you@example.com"
 */

// Load .env.local before anything else
import * as fs from 'fs'
import * as path from 'path'

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.substring(0, eqIdx)
    const value = trimmed.substring(eqIdx + 1)
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}
loadEnvFile()

import * as readline from 'readline'
import { AgentExecutor } from '../lib/agent/executor'
import { AgentSession, Signal, ScenarioType, AgentTarget, AIProviderType, ChannelType } from '../lib/agent/types'
import { setMockInteractionCallback } from '../lib/channels/mock'

interface ParsedArgs {
  target: AgentTarget
  scenario: ScenarioType
  provider: AIProviderType
  model: string
  live: boolean
  channels: ChannelType[]
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2)
  const get = (flag: string, fallback: string): string => {
    const idx = args.indexOf(flag)
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback
  }
  const hasFlag = (flag: string): boolean => args.includes(flag)

  const nameParts = get('--name', 'John Smith').split(' ')
  const provider = get('--provider', process.env.AGENT_AI_PROVIDER || 'claude') as AIProviderType
  const defaultModel = provider === 'claude' ? 'claude-sonnet-4-20250514' : 'llama3.2'

  // Parse --channels "email" or --channels "email,sms,voice"
  const channelsRaw = get('--channels', 'email,sms,voice')
  const channels = channelsRaw.split(',').map((c) => c.trim()) as ChannelType[]

  return {
    target: {
      email: get('--email', 'john.smith@acme.com'),
      phone: get('--phone', '+15551234567'),
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' ') || 'Smith',
      company: get('--company', 'Acme Corp'),
      department: get('--department', 'Engineering'),
      job_title: get('--title', ''),
    },
    scenario: get('--scenario', 'credential_harvest') as ScenarioType,
    provider,
    model: get('--model', defaultModel),
    live: hasFlag('--live'),
    channels,
  }
}

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

// Collect multi-line input (for pasting email replies)
async function askMultiline(rl: readline.Interface, prompt: string): Promise<string> {
  console.log(prompt)
  console.log('  (Type your reply. Enter a blank line when done.)')
  const lines: string[] = []
  while (true) {
    const line = await ask(rl, '  | ')
    if (line === '') break
    lines.push(line)
  }
  return lines.join('\n')
}

// Interactive signal provider — prompts the user to simulate employee reactions
async function interactiveSignalProvider(
  session: AgentSession,
  rl: readline.Interface,
): Promise<Signal | null> {
  const lastAction = session.actions[session.actions.length - 1]
  if (!lastAction) return null

  if (lastAction.channel === 'end') return null

  console.log('\n--- Simulate employee reaction ---')

  if (lastAction.channel === 'email') {
    console.log('Options: [o]pened, [c]licked link, [s]ubmitted form, [re]plied, [rp]reported, [n]o response, [q]uit')
    const response = await ask(rl, '> ')

    switch (response.toLowerCase()) {
      case 'o':
        return { type: 'email_opened', timestamp: new Date().toISOString() }
      case 'c':
        return { type: 'email_clicked', timestamp: new Date().toISOString() }
      case 's':
        return { type: 'email_submitted', timestamp: new Date().toISOString(), data: { fields: ['username', 'password'] } }
      case 're': {
        const reply = await askMultiline(rl, '  Paste/type the email reply:')
        if (!reply) return { type: 'no_response', timestamp: new Date().toISOString() }
        return {
          type: 'email_reply',
          timestamp: new Date().toISOString(),
          data: { message: reply },
        }
      }
      case 'rp':
        return { type: 'email_reported', timestamp: new Date().toISOString() }
      case 'q':
        return null
      default:
        return { type: 'no_response', timestamp: new Date().toISOString() }
    }
  }

  if (lastAction.channel === 'sms') {
    console.log('Type a reply message, or: [n]o response, [q]uit')
    const response = await ask(rl, '> ')

    if (response.toLowerCase() === 'q') return null
    if (response.toLowerCase() === 'n' || response === '') {
      return { type: 'no_response', timestamp: new Date().toISOString() }
    }

    return {
      type: 'sms_reply',
      timestamp: new Date().toISOString(),
      data: { message: response },
    }
  }

  if (lastAction.channel === 'voice') {
    console.log('Options: [a]nswered (then speak), [v]oicemail, [d]eclined, [q]uit')
    const response = await ask(rl, '> ')

    switch (response.toLowerCase()) {
      case 'a': {
        const speech = await ask(rl, 'What does the employee say? > ')
        return {
          type: 'voice_speech',
          timestamp: new Date().toISOString(),
          data: { transcript: speech },
        }
      }
      case 'v':
        return { type: 'voice_voicemail', timestamp: new Date().toISOString() }
      case 'd':
        return { type: 'voice_no_answer', timestamp: new Date().toISOString() }
      case 'q':
        return null
      default:
        return { type: 'voice_no_answer', timestamp: new Date().toISOString() }
    }
  }

  if (lastAction.channel === 'wait') {
    console.log('Agent is waiting. Simulate: [n]o response (timeout), or describe what happens, [q]uit')
    const response = await ask(rl, '> ')

    if (response.toLowerCase() === 'q') return null
    if (response.toLowerCase() === 'n' || response === '') {
      return { type: 'no_response', timestamp: new Date().toISOString() }
    }

    return {
      type: 'email_reply',
      timestamp: new Date().toISOString(),
      data: { message: response },
    }
  }

  return { type: 'no_response', timestamp: new Date().toISOString() }
}

function checkLivePrereqs(channels: ChannelType[]) {
  const issues: string[] = []

  if (channels.includes('email') && !process.env.RESEND_API_KEY) {
    issues.push('RESEND_API_KEY not set — emails will fail')
  }
  if ((channels.includes('sms') || channels.includes('voice')) &&
    (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER)) {
    issues.push('TWILIO credentials not set — SMS and voice calls will fail')
  }

  return issues
}

async function main() {
  const { target, scenario, provider, model, live, channels } = parseArgs()
  const rl = createReadline()

  const mode = live ? 'LIVE' : 'MOCK'

  console.log('='.repeat(60))
  console.log(`  PARABLE — Phishing AI Agent [${mode} MODE]`)
  console.log('='.repeat(60))
  console.log(`  Target:   ${target.first_name} ${target.last_name}`)
  console.log(`  Email:    ${target.email}`)
  console.log(`  Phone:    ${target.phone}`)
  console.log(`  Company:  ${target.company}`)
  console.log(`  Scenario: ${scenario}`)
  console.log(`  Provider: ${provider}`)
  console.log(`  Model:    ${model}`)
  console.log(`  Channels: ${channels.join(', ')} (${live ? 'LIVE' : 'MOCK'})`)
  console.log('='.repeat(60))

  if (live) {
    const issues = checkLivePrereqs(channels)
    if (issues.length > 0) {
      console.log('\n  WARNINGS:')
      for (const issue of issues) {
        console.log(`    - ${issue}`)
      }
    }

    console.log()
    const channelDesc = channels.join('/')
    const confirm = await ask(rl, `  This will send REAL ${channelDesc} messages. Continue? (yes/no) > `)
    if (confirm.toLowerCase() !== 'yes') {
      console.log('  Aborted.')
      rl.close()
      process.exit(0)
    }
  }

  console.log()

  setMockInteractionCallback(null)

  const executor = new AgentExecutor(target, scenario, {
    mock_channels: !live,
    compressed_timing: !live,   // real timing in live mode
    ai_provider: provider,
    ai_model: model,
    max_actions: 15,
    wait_timeout_ms: live ? 5 * 60 * 1000 : 60_000, // 5 min in live mode
    allowed_channels: channels,
  })

  // In mock mode, use the interactive CLI prompt for signals
  // In live mode, signals come from webhooks — no CLI prompting needed
  if (!live) {
    executor.setSignalProvider((session) => interactiveSignalProvider(session, rl))
  }

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\n[AGENT] Interrupted. Stopping session...')
    executor.stop()
    rl.close()
    process.exit(0)
  })

  if (live) {
    console.log('  The agent will send the first email and then wait for replies.')
    console.log('  Reply to the phishing email from your inbox — the agent will')
    console.log('  receive your reply via webhook and respond automatically.')
    console.log()
    console.log('  Make sure your Next.js server is running (npm run dev) and')
    console.log('  the Resend inbound webhook is configured to:')
    console.log(`    ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agent/webhook/email`)
    console.log()
    console.log('  Press Ctrl+C to stop the session.')
    console.log()
  }

  try {
    const finalSession = await executor.run()

    console.log('\n' + '='.repeat(60))
    console.log('  SESSION SUMMARY')
    console.log('='.repeat(60))
    console.log(`  Status: ${finalSession.status}`)
    console.log(`  Total actions: ${finalSession.actions.length}`)
    console.log(`  Total signals: ${finalSession.signals.length}`)
    console.log()

    for (const action of finalSession.actions) {
      console.log(`  [${action.timestamp}] ${action.channel.toUpperCase()}: ${action.reasoning}`)
    }

    console.log()
    console.log(`  Session saved to: agent-sessions/${finalSession.id}.json`)
    console.log('='.repeat(60))
  } catch (error) {
    console.error('\n[AGENT] Fatal error:', error instanceof Error ? error.message : error)
  } finally {
    rl.close()
  }
}

main()
