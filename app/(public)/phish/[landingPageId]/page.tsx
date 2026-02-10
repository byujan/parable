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

  return (
    <div className="min-h-screen">
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      <SimulationDisclosure token={token} />
    </div>
  )
}
