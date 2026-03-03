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
    const { category, difficulty, company_name, industry, additional_context } = body

    if (!category || !difficulty) {
      return NextResponse.json(
        { error: 'Missing required fields: category and difficulty' },
        { status: 400 }
      )
    }

    // Build prompt from request fields
    let prompt = `Generate a ${difficulty} difficulty phishing email template for the category: ${category}.`

    if (company_name) {
      prompt += ` The target company is ${company_name}.`
    }

    if (industry) {
      prompt += ` The company is in the ${industry} industry.`
    }

    if (additional_context) {
      prompt += ` Additional context: ${additional_context}`
    }

    prompt += ` Remember to include subtle red flags that trained users should be able to spot.`

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
