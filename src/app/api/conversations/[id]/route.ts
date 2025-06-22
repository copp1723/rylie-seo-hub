import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          model: msg.model,
          tokens: msg.tokens,
          createdAt: msg.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Get Conversation Error:', error)
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    await prisma.conversation.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted',
    })
  } catch (error) {
    console.error('Delete Conversation Error:', error)
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
  }
}
