import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export interface SendEmailParams {
  to: string
  from: string
  fromName: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(params: SendEmailParams) {
  try {
    const resend = getResend()
    const result = await resend.emails.send({
      from: `${params.fromName} <${params.from}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    })

    return result
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export async function sendBatchEmails(emails: SendEmailParams[]) {
  const results = []
  const batchSize = 10
  const delayMs = 1000 // 1 second delay between batches

  // Process emails in batches of 10
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)

    // Send all emails in current batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map((email) => sendEmail(email))
    )

    results.push(...batchResults)

    // Add delay between batches (except after the last batch)
    if (i + batchSize < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}
