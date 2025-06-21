import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    // Demo mode: Use mock user for development
    const isDemoMode = process.env.NODE_ENV === "development"
    let userId = null
    
    if (isDemoMode) {
      userId = "demo-user-1"
    } else {
      const session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = session.user.id
    }

    const { message, conversationId, model = 'openai/gpt-4-turbo-preview' } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
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
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
    } else {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          userId: userId,
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
        role: 'USER',
        content: message,
      },
    })

    // Prepare messages for AI
    const chatMessages = [
      {
        role: 'system' as const,
        content: `You are Rylie, an AI SEO assistant. You help automotive dealerships with their SEO needs. Be helpful, professional, and focus on actionable SEO advice. Keep responses concise but informative.`,
      },
      ...conversation.messages.map((msg: any) => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ]

    // Generate AI response
    const aiResponse = await aiService.generateResponse(chatMessages, model) as {
      content: string;
      model?: string;
      tokens?: number;
      cost?: number;
    }

    // Save AI message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        userId: userId,
        role: 'ASSISTANT',
        content: aiResponse.content,
        model: aiResponse.model || model,
        tokens: aiResponse.tokens || null,
        cost: aiResponse.cost || null,
      },
    })

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
      },
      userMessage: {
        id: userMessage.id,
        content: userMessage.content,
        createdAt: userMessage.createdAt,
      },
      assistantMessage: {
        id: assistantMessage.id,
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt,
        model: assistantMessage.model,
        tokens: assistantMessage.tokens,
      },
    })

  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

