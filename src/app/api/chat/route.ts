import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/route-handler'
import { getTenantDB } from '@/lib/db/tenant-filter'
import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai'
import { chatRequestSchema, validateRequest } from '@/lib/validation'
import { rateLimits } from '@/lib/rate-limit'
import { logger, performanceTracker, trackEvent } from '@/lib/observability'
import { checkUsageLimits, createTenantPrisma } from '@/lib/tenant'
import { generateSystemPrompt, findRelevantFAQ } from '@/lib/seo-knowledge'

export const POST = withAuth(async (request, context) => {
  const timer = performanceTracker.startTimer('chat_api_request')

  try {
    logger.info('Chat API request started', {
      url: request.url,
      method: request.method,
      userId: context.user.id,
      agencyId: context.tenant.agencyId,
    })

    // Apply rate limiting for AI endpoints
    const rateLimitResult = await rateLimits.ai(request)
    if (rateLimitResult) {
      logger.warn('Rate limit exceeded for chat API', {
        ip: request.headers.get('x-forwarded-for'),
        userId: context.user.id,
      })
      return rateLimitResult
    }

    // Get tenant context from authenticated session
    const tenantContext = context.tenant

    // Super admins bypass usage limits
    if (context.user.isSuperAdmin) {
      logger.info('Super admin access granted for chat API', {
        userId: context.user.id,
        email: context.user.email,
      })
    }

    logger.info('Chat API authenticated with tenant context', {
      userId: tenantContext.user.id,
      agencyId: tenantContext.agencyId,
      agencyPlan: tenantContext.agency.plan,
    })

    // Validate request body
    const body = await request.json()
    const validation = validateRequest(chatRequestSchema, body)

    if (!validation.success) {
      logger.warn('Invalid chat request', {
        userId: tenantContext.user.id,
        errors: validation.details.errors,
        receivedData: body,
      })
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          details: validation.details.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
          received: process.env.NODE_ENV === 'development' ? body : undefined,
        },
        { status: 400 }
      )
    }

    const { message, conversationId, model } = validation.data

    // Create tenant-scoped Prisma client (use regular prisma for super admins)
    const tenantPrisma = context.user.isSuperAdmin ? prisma : createTenantPrisma(tenantContext.agencyId)

    // Track business event with tenant context
    trackEvent('chat_message_sent', {
      user_id: tenantContext.user.id,
      agency_id: tenantContext.agencyId,
      agency_plan: tenantContext.agency.plan,
      model: model,
      has_conversation_id: !!conversationId,
      message_length: message.length,
    })

    // Check usage limits (skip for super admins)
    if (!context.user.isSuperAdmin) {
      const usageLimits = await checkUsageLimits(tenantContext, 'conversations')
      if (!usageLimits.allowed && !conversationId) {
        logger.warn('Conversation limit exceeded', {
          agencyId: tenantContext.agencyId,
          current: usageLimits.current,
          limit: usageLimits.limit,
        })
        return NextResponse.json(
          {
            success: false,
            error: `Conversation limit reached (${usageLimits.limit}). Please upgrade your plan.`,
            details: { current: usageLimits.current, limit: usageLimits.limit },
          },
          { status: 429 }
        )
      }
    }

    // Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await tenantPrisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: tenantContext.user.id,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Last 20 messages for context
          },
        },
      })

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
    } else {
      // Create new conversation (skip for super admins without real agency)
      if (!context.user.isSuperAdmin) {
        conversation = await tenantPrisma.conversation.create({
          data: {
            userId: tenantContext.user.id,
            agencyId: tenantContext.agencyId,
            model,
            title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          },
          include: {
            messages: true,
          },
        })
      } else {
        // For super admins, create a mock conversation object
        conversation = {
          id: 'super-admin-chat',
          messages: []
        }
      }
    }

    // Save user message (skip for super admins without real conversation)
    let userMessage = null
    if (!context.user.isSuperAdmin) {
      userMessage = await tenantPrisma.message.create({
        data: {
          conversationId: conversation.id,
          userId: tenantContext.user.id,
          agencyId: tenantContext.agencyId,
          role: 'USER',
          content: message,
        },
      })
    }

    // Prepare messages for AI with enhanced system prompt
    const chatMessages = [
      {
        role: 'system' as const,
        content: generateSystemPrompt(tenantContext.agency.name),
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

    // Generate AI response
    const aiResponse = (await aiService.generateResponse(chatMessages, model)) as {
      content: string
      model?: string
      tokens?: number
      cost?: number
    }

    // Save AI message (skip for super admins without real conversation)
    let assistantMessage = null
    if (!context.user.isSuperAdmin) {
      assistantMessage = await tenantPrisma.message.create({
        data: {
          conversationId: conversation.id,
          userId: tenantContext.user.id,
          agencyId: tenantContext.agencyId,
          role: 'ASSISTANT',
          content: aiResponse.content,
          model: aiResponse.model || model,
          tokenCount: aiResponse.tokens || null,
        },
      })

      // Update conversation timestamp and message count
      await tenantPrisma.conversation.update({
        where: { id: conversation.id },
        data: {
          updatedAt: new Date(),
          messageCount: { increment: 2 }, // User + assistant message
          lastMessage: aiResponse.content.slice(0, 100),
          lastMessageAt: new Date(),
        },
      })

      // Track usage metrics
      if (aiResponse.tokens) {
        await prisma.usageMetric.create({
          data: {
            agencyId: tenantContext.agencyId,
            metricType: 'tokens',
            value: aiResponse.tokens,
            model: aiResponse.model || model,
            date: new Date(),
            period: 'daily',
          },
        })
      }
    }

    // Track successful completion
    trackEvent('chat_message_completed', {
      user_id: tenantContext.user.id,
      agency_id: tenantContext.agencyId,
      conversation_id: conversation.id,
      model: model,
      tokens_used: aiResponse.tokens || 0,
      response_time_ms: timer.end({
        success: true,
        model: model,
        tokens: aiResponse.tokens || 0,
      }),
    })

    logger.info('Chat API request completed successfully', {
      userId: tenantContext.user.id,
      conversationId: conversation.id,
      model,
      tokensUsed: aiResponse.tokens || 0,
    })

    // For super admins, return a simplified response
    if (tenantContext.user.isSuperAdmin) {
      return NextResponse.json({
        success: true,
        content: aiResponse.content,
        model: aiResponse.model || model,
        tokens: aiResponse.tokens
      })
    }

    // For regular users, return full conversation details
    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
      },
      userMessage: {
        id: userMessage!.id,
        content: userMessage!.content,
        createdAt: userMessage!.createdAt,
      },
      assistantMessage: {
        id: assistantMessage!.id,
        content: assistantMessage!.content,
        createdAt: assistantMessage!.createdAt,
        model: assistantMessage!.model,
        tokens: assistantMessage!.tokenCount,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    timer.end({ success: false, error: errorMessage })

    logger.error('Chat API Error', error, {
      userId: 'unknown',
      conversationId: 'unknown',
      model: 'unknown',
    })

    trackEvent('chat_api_error', {
      user_id: 'unknown',
      error_message: errorMessage,
      model: 'unknown',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process message',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
})