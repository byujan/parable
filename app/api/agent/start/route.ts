import { NextRequest, NextResponse } from 'next/server'
import { AgentExecutor } from '@/lib/agent/executor'
import { AgentTarget, ScenarioType, AIProviderType } from '@/lib/agent/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const target: AgentTarget = {
      email: body.email,
      phone: body.phone,
      first_name: body.first_name,
      last_name: body.last_name,
      company: body.company,
      department: body.department,
      job_title: body.job_title,
    }

    if (!target.email || !target.phone || !target.first_name || !target.last_name || !target.company) {
      return NextResponse.json(
        { error: 'Missing required fields: email, phone, first_name, last_name, company' },
        { status: 400 }
      )
    }

    const scenario = (body.scenario || 'credential_harvest') as ScenarioType

    const provider = (body.provider || process.env.AGENT_AI_PROVIDER || 'claude') as AIProviderType
    const defaultModel = provider === 'claude' ? 'claude-sonnet-4-20250514' : 'llama3.2'

    const executor = new AgentExecutor(target, scenario, {
      mock_channels: body.mock ?? process.env.USE_MOCK_CHANNELS === 'true',
      ai_provider: provider,
      ai_model: body.model || process.env.AGENT_AI_MODEL || defaultModel,
      max_actions: body.max_actions || 15,
    })

    // Start the agent loop in the background (non-blocking)
    // The agent will run autonomously, reacting to webhook signals
    executor.run().catch((err) => {
      console.error(`[AGENT] Session ${executor.getSessionId()} failed:`, err)
    })

    return NextResponse.json({
      session_id: executor.getSessionId(),
      status: 'running',
      target,
      scenario,
    })
  } catch (error) {
    console.error('Error starting agent:', error)
    return NextResponse.json(
      { error: 'Failed to start agent session' },
      { status: 500 }
    )
  }
}
