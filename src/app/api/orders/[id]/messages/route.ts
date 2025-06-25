import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/observability'
import { z } from 'zod'

// Schema for creating message
const createMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['comment', 'status_update', 'completion_note', 'question']).default('comment'),
})

// Using inline type for context directly in function signature
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const orderId = params.id;
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        agencyId: agencyId,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

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

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const orderId = params.id;
    const userId = process.env.DEFAULT_USER_ID || 'test-user-id'
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    const body = await request.json()
    const validation = createMessageSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { content, type } = validation.data

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        agencyId: agencyId,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

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

    await prisma.order.update({
      where: { id: orderId },
      data: { updatedAt: new Date() },
    })

    logger.info('Order message created', {
      messageId: message.id,
      orderId: orderId,
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
