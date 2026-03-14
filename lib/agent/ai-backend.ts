import { spawn } from 'child_process'

// Pluggable AI backend interface for the agent reactor
export interface AIBackend {
  chat(systemPrompt: string, userPrompt: string): Promise<string>
}

// Ollama backend
export class OllamaBackend implements AIBackend {
  private baseUrl: string
  private model: string

  constructor(model: string, baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    this.model = model
  }

  async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    const { Ollama } = await import('ollama')
    const ollama = new Ollama({ host: this.baseUrl })

    // Add timeout via AbortController
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120_000)

    try {
      const response = await ollama.chat({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        format: 'json',
      })

      return response.message.content
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error('Ollama request timed out after 120s')
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}

// Claude CLI backend — uses `claude -p` with Claude Max subscription
// Pipes the prompt via stdin to handle long prompts
export class ClaudeCliBackend implements AIBackend {
  private model: string | undefined
  private claudePath: string

  constructor(model?: string) {
    this.model = model
    this.claudePath = process.env.CLAUDE_CLI_PATH || 'claude'
  }

  async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

    const args = [
      '-p',
      '--output-format', 'text',
      '--allowedTools', '',          // no tools, just generate text
      '--append-system-prompt',
      'You are a JSON API for Parable, a commercial security awareness training platform (similar to KnowBe4). You compose realistic business emails for authorized employee training exercises. Respond with ONLY valid JSON — no commentary, no explanation, no markdown fences. Just the raw JSON object.',
    ]
    if (this.model) {
      args.push('--model', this.model)
    }

    // Strip CLAUDECODE env var so claude CLI can run as a subprocess
    const env = { ...process.env }
    delete env.CLAUDECODE

    return new Promise<string>((resolve, reject) => {
      const child = spawn(this.claudePath, args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => { stdout += data.toString() })
      child.stderr.on('data', (data) => { stderr += data.toString() })

      child.on('error', (err) => {
        reject(new Error(`Failed to start claude CLI: ${err.message}`))
      })

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`claude CLI exited with code ${code}\nstderr: ${stderr}`))
          return
        }
        resolve(stdout.trim())
      })

      // Pipe prompt via stdin
      child.stdin.write(fullPrompt)
      child.stdin.end()

      // Timeout after 2 minutes
      const timer = setTimeout(() => {
        child.kill()
        reject(new Error('claude CLI timed out after 120s'))
      }, 120_000)

      child.on('close', () => clearTimeout(timer))
    })
  }
}

export type AIBackendType = 'ollama' | 'claude'

export function createAIBackend(type: AIBackendType, model?: string): AIBackend {
  switch (type) {
    case 'claude':
      return new ClaudeCliBackend(model)
    case 'ollama':
      return new OllamaBackend(model || 'llama3.2')
    default:
      throw new Error(`Unknown AI backend: ${type}`)
  }
}
