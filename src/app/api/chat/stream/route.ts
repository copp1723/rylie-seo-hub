import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/route-handler'
import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai'
import { generateSystemPrompt } from '@/lib/seo-knowledge'
import { chatRequestSchema, validateRequest } from '@/lib/validation'
import { rateLimits } from '@/lib/rate-limit'
import { logger, trackEvent } from '@/lib/observability'
import { checkPlanLimits } from '@/lib/auth/user-resolver'

export const POST = withAuth(async (request, { user, tenant }) => {
  try {
    logger.info('Stream API request started', {
      userId: user.id,
      agencyId: tenant.agencyId,
    })

    // Apply rate limiting for AI endpoints
    const rateLimitResult = await rateLimits.ai(request)
    if (rateLimitResult) {
      logger.warn('Rate limit exceeded for stream API', {
        userId: user.id,
        ip: request.headers.get('x-forwarded-for'),
      })
      return rateLimitResult
    }

    // Validate request body
    const body = await request.json()
    const validation = validateRequest(chatRequestSchema, body)

    if (!validation.success) {
      logger.warn('Invalid stream request', {
        userId: user.id,
        errors: validation.details.errors,
      })
      return new Response(
        JSON.stringify({
          error: validation.error,
          details: validation.details.errors,
        }),
        { status: 400 }
      )
    }

    const { message, conversationId, model = 'openai/gpt-4-turbo-preview' } = validation.data

    // Track event
    trackEvent('chat_stream_started', {
      user_id: user.id,
      agency_id: tenant.agencyId,
      model: model,
      has_conversation_id: !!conversationId,
    })

    // Check usage limits (skip for super admins)
    if (!user.isSuperAdmin) {
      const usageLimits = await checkPlanLimits(user, 'conversations')
      if (!usageLimits.allowed && !conversationId) {
        logger.warn('Conversation limit exceeded for stream', {
          agencyId: tenant.agencyId,
          current: usageLimits.current,
          limit: usageLimits.limit,
        })
        return new Response(
          JSON.stringify({
            error: `Conversation limit reached (${usageLimits.limit}). Please upgrade your plan.`,
            current: usageLimits.current,
            limit: usageLimits.limit,
          }),
          { status: 429 }
        )
      }
    }

    // Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: user.id,
          agencyId: tenant.agencyId,
          deletedAt: null,
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
          userId: user.id,
          agencyId: tenant.agencyId,
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
        userId: user.id,
        agencyId: tenant.agencyId,
        role: 'USER',
        content: message,
      },
    })

    // Prepare messages for AI with enhanced system prompt
    const chatMessages = [
      {
        role: 'system' as const,
        content: generateSystemPrompt(tenant.agencyName),
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
                  userId: user.id,
                  agencyId: tenant.agencyId,
                  role: 'ASSISTANT',
                  content: fullResponse,
                  model: chunk.model,
                  tokenCount: totalTokens,
                },
              })

              // Update conversation
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                  updatedAt: new Date(),
                  messageCount: { increment: 2 },
                  lastMessage: fullResponse.slice(0, 100),
                  lastMessageAt: new Date(),
                },
              })

              // Track usage metrics
              if (totalTokens > 0) {
                await prisma.usageMetric.create({
                  data: {
                    agencyId: tenant.agencyId,
                    metricType: 'tokens',
                    value: totalTokens,
                    model: chunk.model || model,
                    date: new Date(),
                    period: 'daily',
                  },
                })
              }

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

              // Track completion
              trackEvent('chat_stream_completed', {
                user_id: user.id,
                agency_id: tenant.agencyId,
                conversation_id: conversation.id,
                model: chunk.model || model,
                tokens_used: totalTokens,
              })
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
          logger.error('Streaming error:', error, {
            userId: user.id,
            conversationId: conversation.id,
          })
          
          trackEvent('chat_stream_error', {
            user_id: user.id,
            agency_id: tenant.agencyId,
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })

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
    logger.error('Stream API Error:', error, {
      userId: user.id,
    })
    
    trackEvent('chat_stream_error', {
      user_id: user.id,
      agency_id: tenant.agencyId,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    })

    return new Response('Internal Server Error', { status: 500 })
  }
})