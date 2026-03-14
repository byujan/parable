import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import SimulationDisclosure from '@/components/tracking/simulation-disclosure'

interface PageProps {
  params: {
    landingPageId: string
  }
  searchParams: {
    token?: string
  }
}

/**
 * Extract the inner content from a full HTML document.
 * If the HTML contains <body>...</body>, return just the body contents.
 * Also extracts inline styles from <head> to preserve styling.
 */
function extractBodyContent(html: string): { styles: string; body: string } {
  // Extract <style> tags from anywhere in the document
  const styleMatches = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []
  const styles = styleMatches.join('\n')

  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    // Also grab body tag attributes (like style)
    const bodyTagMatch = html.match(/<body([^>]*)>/i)
    const bodyAttrs = bodyTagMatch?.[1] || ''
    return {
      styles,
      body: `<div${bodyAttrs}>${bodyMatch[1]}</div>`,
    }
  }

  // No body tag — return as-is (might be a fragment)
  return { styles, body: html }
}

export default async function PhishingLandingPage({ params, searchParams }: PageProps) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { landingPageId } = params
  const token = searchParams.token || ''

  // Fetch the landing page
  const { data: landingPage, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('id', landingPageId)
    .single()

  if (error || !landingPage) {
    notFound()
  }

  // Inject token into form fields
  let htmlContent = landingPage.html_content || ''

  // Replace form actions to point to tracking endpoint
  htmlContent = htmlContent.replace(
    /action="[^"]*"/g,
    `action="${process.env.NEXT_PUBLIC_APP_URL}/api/track/submit"`
  )

  // Inject token into hidden input fields named "token"
  htmlContent = htmlContent.replace(
    /<input([^>]*)name="token"([^>]*)value="[^"]*"/g,
    `<input$1name="token"$2value="${token}"`
  )

  // If no token field exists, add one to forms
  htmlContent = htmlContent.replace(
    /<form([^>]*)>/g,
    `<form$1><input type="hidden" name="token" value="${token}" />`
  )

  const { styles, body } = extractBodyContent(htmlContent)

  return (
    <>
      {styles && <div dangerouslySetInnerHTML={{ __html: styles }} />}
      <div
        className="min-h-screen"
        dangerouslySetInnerHTML={{ __html: body }}
      />
      <SimulationDisclosure token={token} />
    </>
  )
}
