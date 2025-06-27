import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subject, description, priority, category, conversationId, chatContext } = body

    // Validate required fields
    if (!subject || !description || !conversationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get user with agency info
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { agency: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if conversation exists and belongs to the user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id,
      },
    })

    if (!conversation) {
      // If conversation doesn't exist in DB, create a temporary one
      // In a real implementation, you'd want to save conversations properly
      const newConversation = await prisma.conversation.create({
        data: {
          id: conversationId,
          title: subject,
          userId: user.id,
          agencyId: user.agencyId || '',
          model: 'gpt-4-turbo',
        },
      })
    }

    // Create the escalation
    const escalation = await prisma.escalation.create({
      data: {
        subject,
        description,
        priority: priority || 'medium',
        category: category || 'other',
        chatContext: chatContext || null,
        userId: user.id,
        userEmail: user.email,
        conversationId,
        agencyId: user.agencyId || '',
        status: 'pending',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        agency: {
          select: {
            name: true,
          },
        },
      },
    })

    // In a real implementation, you might want to:
    // 1. Send an email notification to the SEO team
    // 2. Create a task in your task management system
    // 3. Log this action for audit purposes

    return NextResponse.json({
      success: true,
      escalation: {
        id: escalation.id,
        subject: escalation.subject,
        status: escalation.status,
        createdAt: escalation.createdAt,
      },
    })
  } catch (error) {
    console.error('Error creating escalation:', error)
    return NextResponse.json(
      { error: 'Failed to create escalation' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get escalations for the user
    const escalations = await prisma.escalation.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        conversation: {
          select: {
            title: true,
          },
        },
      },
    })

    return NextResponse.json({
      escalations,
    })
  } catch (error) {
    console.error('Error fetching escalations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch escalations' },
      { status: 500 }
    )
  }
}