import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerAuthClient } from '@/lib/supabase/server'
import { sendEmail, type SendEmailParams } from '@/lib/email/resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const authClient = createServerAuthClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role client for DB operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const campaignId = params.id

    // 1. Get campaign and verify status
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Campaign must be in draft or scheduled status' },
        { status: 400 }
      )
    }

    // 2. Fetch template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', campaign.template_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // 3. Fetch landing page
    const { data: landingPage, error: landingPageError } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('id', campaign.landing_page_id)
      .single()

    if (landingPageError || !landingPage) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 })
    }

    // 4. Fetch all recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('recipients')
      .select('*')
      .eq('list_id', campaign.recipient_list_id)

    if (recipientsError || !recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 404 })
    }

    // 5. Process each recipient
    let successCount = 0
    let failureCount = 0

    for (const recipient of recipients) {
      try {
        // a. Generate unique token
        const token = crypto.randomUUID()

        // b. Personalize email
        let subject = template.subject
          .replace(/\{\{first_name\}\}/g, recipient.first_name || '')
          .replace(/\{\{last_name\}\}/g, recipient.last_name || '')
          .replace(/\{\{email\}\}/g, recipient.email || '')

        let htmlBody = template.html_body
          .replace(/\{\{first_name\}\}/g, recipient.first_name || '')
          .replace(/\{\{last_name\}\}/g, recipient.last_name || '')
          .replace(/\{\{email\}\}/g, recipient.email || '')

        // c. Inject tracking pixel
        const trackingPixel = `<img src="${APP_URL}/api/track/open?token=${token}" width="1" height="1" style="display:none" alt="" />`
        htmlBody = htmlBody + trackingPixel

        // d. Replace href links with tracked redirects
        htmlBody = htmlBody.replace(
          /href="([^"]+)"/g,
          (match: string, url: string) => {
            // Skip anchor links and mailto links
            if (url.startsWith('#') || url.startsWith('mailto:')) {
              return match
            }
            const trackedUrl = `${APP_URL}/api/track/click?token=${token}&url=${encodeURIComponent(url)}`
            return `href="${trackedUrl}"`
          }
        )

        // e. Add main CTA link (replace placeholder if exists, otherwise append)
        const landingPageUrl = `${APP_URL}/phish/${campaign.landing_page_id}?token=${token}`
        if (htmlBody.includes('{{landing_page_url}}')) {
          htmlBody = htmlBody.replace(/\{\{landing_page_url\}\}/g, landingPageUrl)
        }

        // f. Prepare email params
        const emailParams: SendEmailParams = {
          to: recipient.email,
          subject: subject,
          html: htmlBody,
          text: template.text_body || '',
          from: template.sender_email || 'noreply@parable.security',
          fromName: template.sender_name || 'IT Department',
        }

        // g. Send email and record event
        try {
          await sendEmail(emailParams)
          await supabase.from('campaign_events').insert({
            campaign_id: campaignId,
            recipient_id: recipient.id,
            event_type: 'sent',
            token: token,
            metadata: {},
          })
          successCount++
        } catch (sendError) {
          console.error(`Failed to send to ${recipient.email}:`, sendError)
          failureCount++
        }
      } catch (error) {
        console.error(`Error processing recipient ${recipient.email}:`, error)
        failureCount++
      }

      // Rate limiting: small delay every 10 emails
      if ((successCount + failureCount) % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    // 6. Update campaign status
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    if (updateError) {
      console.error('Error updating campaign:', updateError)
    }

    // 7. Return success
    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      total: recipients.length,
    })
  } catch (error) {
    console.error('Error sending campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
