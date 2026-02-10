import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai/provider'

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
    const body = await request.json()
    const { template_id, count } = body

    if (!template_id || !count) {
      return NextResponse.json(
        { error: 'Missing required fields: template_id and count' },
        { status: 400 }
      )
    }

    if (typeof count !== 'number' || count < 1 || count > 10) {
      return NextResponse.json(
        { error: 'Count must be a number between 1 and 10' },
        { status: 400 }
      )
    }

    // Fetch template from Supabase
    const { data: template, error: fetchError } = await supabase
      .from('templates')
      .select('subject, html_body, text_body')
      .eq('id', template_id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Generate variants using AI provider
    const aiProvider = getAIProvider()
    const variants = await aiProvider.generateVariants(
      {
        subject: template.subject,
        html_body: template.html_body,
        text_body: template.text_body,
      },
      count
    )

    return NextResponse.json({ variants })
  } catch (error) {
    console.error('Error generating variants:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate variants' },
      { status: 500 }
    )
  }
}
