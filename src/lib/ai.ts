import OpenAI from 'openai'

const openai = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: process.env.OPENROUTER_BASE_URL,
    })
  : null

export interface AIModel {
  id: string
  name: string
  provider: string
  description: string
  maxTokens: number
  costPer1kTokens: number
}

export const availableModels: AIModel[] = [
  {
    id: 'openai/gpt-4-turbo-preview',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    description: 'Most capable model for complex reasoning',
    maxTokens: 128000,
    costPer1kTokens: 0.01,
  },
  {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: 'Fast and efficient for most tasks',
    maxTokens: 16385,
    costPer1kTokens: 0.0005,
  },
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Excellent for detailed analysis',
    maxTokens: 200000,
    costPer1kTokens: 0.015,
  },
  {
    id: 'anthropic/claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: 'Balanced performance',
    maxTokens: 200000,
    costPer1kTokens: 0.003,
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Fast and cost-effective',
    maxTokens: 200000,
    costPer1kTokens: 0.00025,
  },
]

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface StreamResponse {
  content: string
  done: boolean
  model?: string
  tokens?: number
}

export class AIService {
  async generateResponse(
    messages: ChatMessage[],
    model: string = 'openai/gpt-4-turbo-preview',
    stream: boolean = false
  ) {
    if (!openai) {
      throw new Error(
        'AI service not configured. Please set OPENROUTER_API_KEY environment variable.'
      )
    }

    try {
      const response = await openai.chat.completions.create({
        model,
        messages,
        stream,
        max_tokens: 4000,
        temperature: 0.7,
      })

      if (stream) {
        return response // Return the stream
      } else {
        const completion = response as OpenAI.Chat.Completions.ChatCompletion
        return {
          content: completion.choices[0]?.message?.content || '',
          model: completion.model,
          tokens: completion.usage?.total_tokens,
          cost: this.calculateCost(completion.usage?.total_tokens || 0, model),
        }
      }
    } catch (error) {
      console.error('AI Service Error:', error)
      throw new Error('Failed to generate AI response')
    }
  }

  async *streamResponse(
    messages: ChatMessage[],
    model: string = 'openai/gpt-4-turbo-preview'
  ): AsyncGenerator<StreamResponse> {
    if (!openai) {
      throw new Error(
        'AI service not configured. Please set OPENROUTER_API_KEY environment variable.'
      )
    }

    try {
      const stream = await openai.chat.completions.create({
        model,
        messages,
        stream: true,
        max_tokens: 4000,
        temperature: 0.7,
      })

      let fullContent = ''

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        fullContent += content

        yield {
          content,
          done: false,
          model: chunk.model,
        }
      }

      // Final chunk with token count
      yield {
        content: '',
        done: true,
        model,
        tokens: this.estimateTokens(fullContent),
      }
    } catch (error) {
      console.error('AI Streaming Error:', error)
      throw new Error('Failed to stream AI response')
    }
  }

  private calculateCost(tokens: number, model: string): number {
    const modelInfo = availableModels.find(m => m.id === model)
    if (!modelInfo) return 0
    return (tokens / 1000) * modelInfo.costPer1kTokens
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  getAvailableModels(): AIModel[] {
    return availableModels
  }

  getModel(id: string): AIModel | undefined {
    return availableModels.find(m => m.id === id)
  }
}

export const aiService = new AIService()
