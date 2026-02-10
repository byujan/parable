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
    const { template_id } = body

    if (!template_id) {
      return NextResponse.json(
        { error: 'Missing required field: template_id' },
        { status: 400 }
      )
    }

    // Fetch template from Supabase
    const { data: template, error: fetchError } = await supabase
      .from('templates')
      .select('subject, html_body')
      .eq('id', template_id)
      .single()

    if (fetchError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Generate training content using AI provider
    const aiProvider = getAIProvider()
    const contentHtml = await aiProvider.generateTrainingContent(
      template.subject,
      template.html_body
    )

    return NextResponse.json({ content_html: contentHtml })
  } catch (error) {
    console.error('Error generating training content:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate training content' },
      { status: 500 }
    )
  }
}
