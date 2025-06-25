import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/observability'
import { z } from 'zod'

// Schema for creating message
const createMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['comment', 'status_update', 'completion_note', 'question']).default('comment')
})

interface MessagesRouteParams extends Record<string, any> { // Added extends Record<string, any>
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: MessagesRouteParams) {
  try {
    const orderId = params.id
    
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    const order = await prisma.order.findFirst({
      where: { id: orderId, agencyId: agencyId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // TODO:AGENT2_PRISMA - Define OrderMessage model and relation
    // Actual logic for fetching messages commented out

    return NextResponse.json({
      success: true,
      messages: [] // Return empty array until model is defined
    })
  } catch (error) {
    logger.error('Error fetching order messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: MessagesRouteParams) { // Use new interface name
  try {
    const orderId = params.id
    
    // const userId = process.env.DEFAULT_USER_ID || 'test-user-id' // Unused
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
      where: { id: orderId, agencyId: agencyId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // TODO:AGENT2_PRISMA - Define OrderMessage model and relation
    // Actual logic for creating message commented out

    logger.info('Order message creation attempted (OrderMessage model pending)', {
      orderId,
      type
    })

    return NextResponse.json({
      success: true,
      message: { content, type, note: "Message not saved, OrderMessage model pending" }
    })
  } catch (error) {
    logger.error('Error creating order message:', error)
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
}