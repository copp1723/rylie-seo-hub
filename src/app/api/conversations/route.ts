import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimits } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimits.api(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }
    const userId = session.user.id

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Just the last message for preview
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
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
  } catch (error) {
    console.error('Conversations API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}

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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = session.user.id
    }

    const { title, model = 'openai/gpt-4-turbo-preview' } = await request.json()

       const conversation = await prisma.conversation.create({
      data: {
        title: title || 'New Conversation',
        userId: userId,
        agencyId: 'default', // TODO: Get from tenant context
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
}
