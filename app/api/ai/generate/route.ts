import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai/provider'
import { GenerateTemplateRequest } from '@/lib/types'

export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: GenerateTemplateRequest = await request.json()
    const {
      category,
      difficulty,
      company_name,
      industry,
      additional_context,
      impersonated_sender,
      scenario,
      urgency,
      target_audience,
      campaign_context,
    } = body

    if (!category || !difficulty) {
      return NextResponse.json(
        { error: 'Missing required fields: category and difficulty' },
        { status: 400 }
      )
    }

    // Build structured prompt from request fields
    const parts: string[] = []
    if (impersonated_sender) {
      parts.push(`Impersonated sender: ${impersonated_sender}.`)
    }
    if (scenario) {
      parts.push(`Scenario: ${scenario}.`)
    }
    if (urgency) {
      parts.push(`Urgency/tone: ${urgency}.`)
    }
    if (target_audience) {
      parts.push(`Target audience: ${target_audience}.`)
    }
    if (company_name) {
      parts.push(`Company: ${company_name}.`)
    }
    if (industry) {
      parts.push(`Industry: ${industry}.`)
    }
    parts.push(`Category: ${category}. Difficulty: ${difficulty}.`)
    if (campaign_context) {
      const campaignParts: string[] = [`Campaign: ${campaign_context.campaign_name}`]
      if (campaign_context.recipient_list_name) {
        campaignParts.push(`Recipient list: ${campaign_context.recipient_list_name}`)
      }
      if (campaign_context.audience_summary) {
        campaignParts.push(`Audience: ${campaign_context.audience_summary}`)
      }
      parts.push(campaignParts.join('. ') + '.')
    }
    if (additional_context) {
      parts.push(`Additional context: ${additional_context}`)
    }

    const prompt = `${parts.join(' ')} Generate a realistic phishing email that could fool an untrained user. Include 2–3 subtle red flags that security-trained users can spot.`

    // Generate template using AI provider
    const aiProvider = getAIProvider()
    const template = await aiProvider.generateTemplate(prompt)

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error generating template:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}
