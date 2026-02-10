import { GenerateTemplateResponse } from '@/lib/types'
import { OllamaProvider } from './ollama'

export interface AIProvider {
  generateTemplate(prompt: string): Promise<GenerateTemplateResponse>
  generateTrainingContent(
    templateSubject: string,
    templateBody: string
  ): Promise<string>
  generateVariants(
    template: { subject: string; html_body: string; text_body: string },
    count: number
  ): Promise<GenerateTemplateResponse[]>
}

export type AIProviderType = 'ollama' // | 'openai' | 'anthropic' for future

export function getAIProvider(type: AIProviderType = 'ollama'): AIProvider {
  switch (type) {
    case 'ollama':
      return new OllamaProvider()
    default:
      throw new Error(`Unsupported AI provider: ${type}`)
  }
}
