import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai'
import { generateSystemPrompt } from '@/lib/seo-knowledge'

export async function POST(request: NextRequest) {
  try {
    // Demo mode: Use mock user for development
    const isDemoMode = process.env.NODE_ENV === 'development'
    let userId = null

    if (isDemoMode) {
      userId = 'demo-user-1'
    } else {
      const session = await auth()
      if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 })
      }
      userId = session.user.id
    }

    const { message, conversationId, model = 'openai/gpt-4-turbo-preview' } = await request.json()

    if (!message) {
      return new Response('Message is required', { status: 400 })
    }

    // Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: userId,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Last 20 messages for context
          },
        },
      })

      if (!conversation) {
        return new Response('Conversation not found', { status: 404 })
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId: userId,
          agencyId: 'default', // TODO: Get from tenant context
          model,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        },
        include: {
          messages: true,
        },
      })
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId: userId,
        agencyId: 'default', // TODO: Get from tenant context
        role: 'USER',
        content: message,
      },
    })

    // Prepare messages for AI with enhanced system prompt
    const agencyName = 'your dealership' // TODO: Get from tenant context
    const chatMessages = [
      {
        role: 'system' as const,
        content: generateSystemPrompt(agencyName),
      },
      ...conversation.messages.map((msg: { role: string; content: string }) => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ]

    // Create streaming response
    const encoder = new TextEncoder()
    let fullResponse = ''
    let totalTokens = 0

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial data
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'conversation',
                data: {
                  id: conversation.id,
                  title: conversation.title,
                },
              })}\n\n`
            )
          )

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'userMessage',
                data: {
                  id: userMessage.id,
                  content: userMessage.content,
                  createdAt: userMessage.createdAt,
                },
              })}\n\n`
            )
          )

          // Stream AI response
          for await (const chunk of aiService.streamResponse(chatMessages, model)) {
            if (chunk.done) {
              totalTokens = chunk.tokens || 0

              // Save complete AI message
              const assistantMessage = await prisma.message.create({
                data: {
                  conversationId: conversation.id,
                  userId: userId,
                  agencyId: 'default', // TODO: Get from tenant context
                  role: 'ASSISTANT',
                  content: fullResponse,
                  model: chunk.model,
                  tokenCount: totalTokens,
                },
              })

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'complete',
                    data: {
                      id: assistantMessage.id,
                      tokens: totalTokens,
                      model: chunk.model,
                    },
                  })}\n\n`
                )
              )
            } else {
              fullResponse += chunk.content
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'chunk',
                    data: { content: chunk.content },
                  })}\n\n`
                )
              )
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                data: { message: 'Failed to generate response' },
              })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Stream API Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
