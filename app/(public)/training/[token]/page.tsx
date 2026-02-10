import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import CompleteTrainingButton from '@/components/tracking/complete-training-button'
import { ShieldCheck } from 'lucide-react'

interface PageProps {
  params: {
    token: string
  }
}

export default async function TrainingPage({ params }: PageProps) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { token } = params

  // Look up the sent event by token
  const { data: sentEvent, error: sentError } = await supabase
    .from('campaign_events')
    .select('campaign_id, recipient_id')
    .eq('token', token)
    .eq('event_type', 'sent')
    .single()

  if (sentError || !sentEvent) {
    notFound()
  }

  // Look up the campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('template_id')
    .eq('id', sentEvent.campaign_id)
    .single()

  // Look up training module linked to the template
  let trainingModule = null
  if (campaign && campaign.template_id) {
    const { data } = await supabase
      .from('training_modules')
      .select('*')
      .eq('linked_template_id', campaign.template_id)
      .single()

    trainingModule = data
  }

  // Generic training content if no module found
  const genericContent = `
    <div class="space-y-6">
      <h2 class="text-2xl font-bold text-gray-900">Understanding Phishing Attacks</h2>

      <div class="prose prose-lg">
        <p>
          You've just experienced a simulated phishing attack. This training will help you
          recognize and avoid real phishing attempts in the future.
        </p>

        <h3 class="text-xl font-semibold mt-6 mb-3">What is Phishing?</h3>
        <p>
          Phishing is a type of social engineering attack where criminals impersonate
          legitimate organizations to steal sensitive information, credentials, or money.
        </p>

        <h3 class="text-xl font-semibold mt-6 mb-3">Warning Signs to Watch For:</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>Urgent or threatening language:</strong> Claims your account will be closed or compromised</li>
          <li><strong>Suspicious sender addresses:</strong> Email addresses that don't match the official domain</li>
          <li><strong>Generic greetings:</strong> "Dear Customer" instead of your name</li>
          <li><strong>Spelling and grammar errors:</strong> Professional companies proofread their communications</li>
          <li><strong>Unexpected attachments or links:</strong> Especially if you weren't expecting them</li>
          <li><strong>Requests for sensitive information:</strong> Legitimate companies never ask for passwords via email</li>
        </ul>

        <h3 class="text-xl font-semibold mt-6 mb-3">What Should You Do?</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li>Verify the sender by contacting them through official channels</li>
          <li>Hover over links to see where they actually go before clicking</li>
          <li>Report suspicious emails to your IT or security team</li>
          <li>Never provide credentials or sensitive data via email</li>
          <li>When in doubt, don't click - contact your security team instead</li>
        </ul>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mt-6">
          <p class="text-blue-900">
            <strong>Remember:</strong> It's always better to verify and be safe than to fall
            victim to a real attack. Your vigilance is your organization's first line of defense.
          </p>
        </div>
      </div>
    </div>
  `

  const trainingContent = trainingModule?.content || genericContent

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Parable Security Training</h1>
          </div>
        </div>

        {/* Training Content */}
        <div className="bg-white shadow-sm rounded-lg p-8 mb-8">
          <div dangerouslySetInnerHTML={{ __html: trainingContent }} />
        </div>

        {/* Complete Button */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <CompleteTrainingButton token={token} />
        </div>
      </div>
    </div>
  )
}
