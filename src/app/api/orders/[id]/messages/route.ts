import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/observability'
import { z } from 'zod'

// Schema for creating message
const createMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['comment', 'status_update', 'completion_note', 'question']).default('comment'),
})

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const orderId = params.id

    // Auth disabled - using default values
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    // Verify order exists and belongs to agency
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        agencyId: agencyId,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Get all messages for this order
    const messages = await prisma.orderMessage.findMany({
      where: {
        orderId: orderId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      messages: messages,
    })
  } catch (error) {
    logger.error('Error fetching order messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const orderId = params.id

    // Auth disabled - using default values
    const userId = process.env.DEFAULT_USER_ID || 'test-user-id'
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    // Parse and validate request body
    const body = await request.json()
    const validation = createMessageSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { content, type } = validation.data

    // Verify order exists and belongs to agency
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        agencyId: agencyId,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Create message
    const message = await prisma.orderMessage.create({
      data: {
        orderId: orderId,
        agencyId: agencyId,
        userId: userId,
        content: content,
        type: type,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Update order's updatedAt timestamp
    await prisma.order.update({
      where: { id: orderId },
      data: { updatedAt: new Date() },
    })

    logger.info('Order message created', {
      orderId,
      messageId: message.id,
      type,
    })

    return NextResponse.json({
      success: true,
      message: message,
    })
  } catch (error) {
    logger.error('Error creating order message:', error)
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
  }
}
