#!/usr/bin/env npx tsx
/**
 * Campaign worker — polls Supabase for pending agent sessions and runs them locally.
 *
 * Usage:
 *   npx tsx scripts/campaign-worker.ts
 *
 * The campaign builder UI creates sessions in Supabase with status "pending".
 * This worker picks them up, runs the AI agent loop, and updates the session.
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

import { createClient } from '@supabase/supabase-js'
import { AgentExecutor } from '../lib/agent/executor'
import { AgentTarget, ScenarioType, ChannelType, AgentConfig } from '../lib/agent/types'

const POLL_INTERVAL_MS = 5_000

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Track running sessions so we don't double-pick them
const runningSessions = new Set<string>()

async function pollForPendingSessions() {
  const supabase = getSupabase()

  // Find sessions that are pending (created by the UI but not yet picked up)
  const { data: sessions, error } = await supabase
    .from('agent_sessions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[WORKER] Error polling sessions:', error.message)
    return
  }

  if (!sessions || sessions.length === 0) return

  console.log(`[WORKER] Found ${sessions.length} pending session(s)`)

  for (const session of sessions) {
    if (runningSessions.has(session.id)) continue

    runningSessions.add(session.id)

    // Mark as running so no other worker picks it up
    await supabase
      .from('agent_sessions')
      .update({ status: 'running' })
      .eq('id', session.id)

    const target = session.target as AgentTarget
    const config = session.config as AgentConfig

    console.log(`[WORKER] Starting session ${session.id} for ${target.first_name} ${target.last_name}`)

    const executor = new AgentExecutor(target, session.scenario as ScenarioType, {
      ...config,
      mock_channels: false,
    })

    // Override the session ID to match the one created by the UI
    // We need to use the executor's run method but with our session ID
    executor.run()
      .then(() => {
        console.log(`[WORKER] Session ${session.id} completed`)
        runningSessions.delete(session.id)
      })
      .catch((err) => {
        console.error(`[WORKER] Session ${session.id} failed:`, err.message)
        runningSessions.delete(session.id)
        supabase
          .from('agent_sessions')
          .update({ status: 'failed' })
          .eq('id', session.id)
      })
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('  PARABLE — Campaign Worker')
  console.log('='.repeat(60))
  console.log(`  Polling for pending sessions every ${POLL_INTERVAL_MS / 1000}s...`)
  console.log('  Press Ctrl+C to stop.')
  console.log('='.repeat(60))
  console.log()

  // Poll loop
  const poll = async () => {
    await pollForPendingSessions()
    setTimeout(poll, POLL_INTERVAL_MS)
  }

  poll()

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n[WORKER] Shutting down...')
    process.exit(0)
  })
}

main()
