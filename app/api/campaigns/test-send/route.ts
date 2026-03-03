import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerAuthClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authClient = await createServerAuthClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role client for DB operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { template_id, landing_page_id } = body

    if (!template_id || !landing_page_id) {
      return NextResponse.json(
        { error: 'template_id and landing_page_id are required' },
        { status: 400 }
      )
    }

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', template_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Fetch landing page
    const { data: landingPage, error: landingPageError } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('id', landing_page_id)
      .single()

    if (landingPageError || !landingPage) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 })
    }

    // Generate test token
    const token = `test-${crypto.randomUUID()}`

    // Get admin's email and name
    const adminEmail = user.email!
    const adminName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin'
    const firstName = adminName.split(' ')[0]
    const lastName = adminName.split(' ').slice(1).join(' ') || ''

    // Personalize email
    let subject = template.subject
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{last_name\}\}/g, lastName)
      .replace(/\{\{email\}\}/g, adminEmail)

    let htmlBody = template.html_body
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{last_name\}\}/g, lastName)
      .replace(/\{\{email\}\}/g, adminEmail)

    // Inject tracking pixel
    const trackingPixel = `<img src="${APP_URL}/api/track/open?token=${token}" width="1" height="1" style="display:none" alt="" />`
    htmlBody = htmlBody + trackingPixel

    // Replace href links with tracked redirects
    htmlBody = htmlBody.replace(
      /href="([^"]+)"/g,
      (match: string, url: string) => {
        if (url.startsWith('#') || url.startsWith('mailto:')) {
          return match
        }
        const trackedUrl = `${APP_URL}/api/track/click?token=${token}&url=${encodeURIComponent(url)}`
        return `href="${trackedUrl}"`
      }
    )

    // Add main CTA link
    const landingPageUrl = `${APP_URL}/phish/${landing_page_id}?token=${token}`
    if (htmlBody.includes('{{landing_page_url}}')) {
      htmlBody = htmlBody.replace(/\{\{landing_page_url\}\}/g, landingPageUrl)
    }

    // Send email
    await sendEmail({
      to: adminEmail,
      subject: `[TEST] ${subject}`,
      html: htmlBody,
      from: template.sender_email || 'noreply@parable.security',
      fromName: template.sender_name || 'IT Department',
    })

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${adminEmail}`,
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
