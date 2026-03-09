import { Ollama } from 'ollama'
import { GenerateTemplateResponse } from '@/lib/types'
import type { AIProvider } from './provider'

export class OllamaProvider implements AIProvider {
  private ollama: Ollama
  private model: string

  constructor(
    baseUrl: string = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: string = 'llama3.2'
  ) {
    this.ollama = new Ollama({ host: baseUrl })
    this.model = model
  }

  async generateTemplate(prompt: string): Promise<GenerateTemplateResponse> {
    try {
      const systemPrompt = `You are a security awareness training content creator. Generate a realistic, convincing phishing email that would plausibly be opened by the target audience. It is for authorized internal security training only; never generate content intended for real-world attacks. Include subtle red flags that trained users can spot; do not make it obviously fake or educational-sounding. All content will be marked as [SIMULATION TEMPLATE] by the system. Respond ONLY with valid JSON matching this exact schema: { "subject": string, "html_body": string (HTML email body), "text_body": string (plain text version), "sender_name": string, "sender_email": string }`

      const response = await this.ollama.chat({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        format: 'json',
      })

      const content = response.message.content
      let parsedResponse: GenerateTemplateResponse

      try {
        parsedResponse = JSON.parse(content)
      } catch (parseError) {
        throw new Error(`Failed to parse AI response as JSON. The model returned invalid JSON.`)
      }

      // Validate required fields
      const requiredFields = ['subject', 'html_body', 'text_body', 'sender_name', 'sender_email'] as const
      for (const field of requiredFields) {
        if (!parsedResponse[field] || typeof parsedResponse[field] !== 'string') {
          throw new Error(`AI response missing or invalid field: ${field}`)
        }
      }

      // Wrap html_body with simulation template comment
      parsedResponse.html_body = `<!-- [SIMULATION TEMPLATE - For authorized security training only] -->\n${parsedResponse.html_body}`

      return parsedResponse
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Ollama service unavailable or failed to generate template: ${error.message}`
        )
      }
      throw new Error('Failed to connect to Ollama service. Please ensure Ollama is running.')
    }
  }

  async generateTrainingContent(
    templateSubject: string,
    templateBody: string
  ): Promise<string> {
    try {
      const systemPrompt = `You are a cybersecurity educator. Given a simulated phishing email, create a short, engaging micro-training module in HTML format. The training should: 1) Explain what type of phishing attack this simulates, 2) Highlight the specific red flags in the email (with visual callouts), 3) Provide 3-5 actionable tips for spotting similar attacks, 4) Be encouraging and non-judgmental in tone. Format as clean HTML with inline styles suitable for embedding. Keep it concise - aim for 2-3 minutes of reading time.`

      const userPrompt = `Subject: ${templateSubject}\n\nEmail Body:\n${templateBody}`

      const response = await this.ollama.chat({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      })

      return response.message.content
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Ollama service unavailable or failed to generate training content: ${error.message}`
        )
      }
      throw new Error('Failed to connect to Ollama service. Please ensure Ollama is running.')
    }
  }

  async generateVariants(
    template: { subject: string; html_body: string; text_body: string },
    count: number
  ): Promise<GenerateTemplateResponse[]> {
    try {
      const systemPrompt = `You are a security awareness training content creator. You create SIMULATED phishing email templates for authorized internal security training exercises only. Create ${count} variations of the provided template with different tone, urgency, and branding, but using the same attack vector and red flags. Each variation should be realistic but educational. Respond ONLY with valid JSON matching this exact schema: an array of objects, each with { "subject": string, "html_body": string (HTML email body), "text_body": string (plain text version), "sender_name": string, "sender_email": string }`

      const userPrompt = `Create ${count} variations of this template:\n\nSubject: ${template.subject}\n\nHTML Body:\n${template.html_body}\n\nText Body:\n${template.text_body}`

      const response = await this.ollama.chat({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        format: 'json',
      })

      const content = response.message.content
      let parsedResponse: GenerateTemplateResponse[]

      try {
        parsedResponse = JSON.parse(content)
        if (!Array.isArray(parsedResponse)) {
          throw new Error('Response is not an array')
        }
      } catch (parseError) {
        throw new Error(`Failed to parse AI response as JSON array: ${content}`)
      }

      // Wrap each html_body with simulation template comment
      parsedResponse = parsedResponse.map((variant) => ({
        ...variant,
        html_body: `<!-- [SIMULATION TEMPLATE - For authorized security training only] -->\n${variant.html_body}`,
      }))

      return parsedResponse
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Ollama service unavailable or failed to generate variants: ${error.message}`
        )
      }
      throw new Error('Failed to connect to Ollama service. Please ensure Ollama is running.')
    }
  }
}
