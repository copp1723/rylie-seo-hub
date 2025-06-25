import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/route-handler'
import { getTenantDB } from '@/lib/db/tenant-filter'
import { rateLimits } from '@/lib/rate-limit'

export const GET = withAuth(async (request, context) => {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimits.api(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Check if user has an agency (skip for super admins)
    if (!context.user.isSuperAdmin && !context.tenant.agencyId) {
      return NextResponse.json(
        { error: 'Agency configuration required' },
        { status: 403 }
      )
    }

    // For super admins without agency, use regular prisma
    if (context.user.isSuperAdmin && !context.tenant.agencyId) {
      const { prisma } = await import('@/lib/prisma')
      const conversations = await prisma.conversation.findMany({
        where: { userId: context.user.id },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { messages: true },
          },
        },
      })

      const formattedConversations = conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        model: conv.model,
        messageCount: conv._count.messages,
        lastMessage:
          conv.messages[0]?.content?.slice(0, 100) +
          (conv.messages[0]?.content?.length > 100 ? '...' : ''),
        lastMessageAt: conv.messages[0]?.createdAt,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      }))

      return NextResponse.json({
        success: true,
        conversations: formattedConversations,
      })
    }

    // Get tenant-aware database instance
    const db = getTenantDB(context as any)

    const conversations = await db.findConversations(
      { userId: context.user.id },
      {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Just the last message for preview
        },
        _count: {
          select: { messages: true },
        },
      }
    )

    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      model: conv.model,
      messageCount: conv._count.messages,
      lastMessage:
        conv.messages[0]?.content?.slice(0, 100) +
        (conv.messages[0]?.content?.length > 100 ? '...' : ''),
      lastMessageAt: conv.messages[0]?.createdAt,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      conversations: formattedConversations,
    })
  } catch (error) {
    console.error('Conversations API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
})

export const POST = withAuth(async (request, context) => {
  try {
    const { title, model = 'openai/gpt-4-turbo-preview' } = await request.json()

    // Check if user has an agency (skip for super admins)
    if (!context.user.isSuperAdmin && !context.tenant.agencyId) {
      return NextResponse.json(
        { error: 'Agency configuration required' },
        { status: 403 }
      )
    }

    // Import prisma for creation (tenant-aware DB doesn't have createConversation yet)
    const { prisma } = await import('@/lib/prisma')

    // For super admins without agency, create without agency checks
    if (context.user.isSuperAdmin && !context.tenant.agencyId) {
      const conversation = await prisma.conversation.create({
        data: {
          title: title || 'New Conversation',
          userId: context.user.id,
          model,
        },
        include: {
          messages: true,
        },
      })

      return NextResponse.json({
        conversation: {
          id: conversation.id,
          title: conversation.title,
          model: conversation.model,
          createdAt: conversation.createdAt,
        },
      })
    }

    // Check conversation limits for regular users
    const conversationCount = await prisma.conversation.count({
      where: { agencyId: context.tenant.agencyId }
    })
    
    const agency = await prisma.agency.findUnique({
      where: { id: context.tenant.agencyId! },
      select: { maxConversations: true }
    })

    if (agency && conversationCount >= agency.maxConversations) {
      return NextResponse.json(
        { error: 'Conversation limit reached for your plan' },
        { status: 403 }
      )
    }

    // Create conversation with proper tenant context
    const conversation = await prisma.conversation.create({
      data: {
        title: title || 'New Conversation',
        userId: context.user.id,
        agencyId: context.tenant.agencyId!, // Use agency from session context
        model,
      },
      include: {
        messages: true,
      },
    })

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        createdAt: conversation.createdAt,
      },
    })
  } catch (error) {
    console.error('Create Conversation Error:', error)
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }
})