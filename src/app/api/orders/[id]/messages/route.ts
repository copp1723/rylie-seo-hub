import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse, getRouteParams } from '@/lib/api/route-handler'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateRequest } from '@/lib/validation'
import { logger } from '@/lib/observability'

// Schema for creating message
const createMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['comment', 'status_update', 'completion_note', 'question']).default('comment')
})

// GET messages for an order
export const GET = withAuth(async (request, { user, tenant }, context) => {
  const { id } = getRouteParams<{ id: string }>(context)

  try {
    // Check if order exists and user has access
    const order = await prisma.order.findFirst({
      where: {
        id,
        agencyId: tenant.agencyId,
        deletedAt: null
      }
    })

    if (!order) {
      return errorResponse('Order not found', 404)
    }

    // Check permissions
    if (!user.isSuperAdmin && order.userId !== user.id && user.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    // Get messages
    const messages = await prisma.orderMessage.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    return successResponse({ messages })
  } catch (error) {
    logger.error('Error fetching order messages:', error)
    return errorResponse('Failed to fetch messages', 500)
  }
})

// POST create new message
export const POST = withAuth(async (request, { user, tenant }, context) => {
  const { id } = getRouteParams<{ id: string }>(context)

  try {
    // Check if order exists and user has access
    const order = await prisma.order.findFirst({
      where: {
        id,
        agencyId: tenant.agencyId,
        deletedAt: null
      }
    })

    if (!order) {
      return errorResponse('Order not found', 404)
    }

    // Check permissions
    if (!user.isSuperAdmin && order.userId !== user.id && user.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    // Validate request body
    const body = await request.json()
    const validation = validateRequest(createMessageSchema, body)

    if (!validation.success) {
      return errorResponse(validation.error, 400, validation.details)
    }

    const { content, type } = validation.data

    // Create message
    const message = await prisma.orderMessage.create({
      data: {
        orderId: id,
        userId: user.id,
        content,
        type
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    logger.info('Order message created', {
      orderId: id,
      messageId: message.id,
      userId: user.id,
      type
    })

    return successResponse({ message }, 'Message added successfully', 201)
  } catch (error) {
    logger.error('Error creating order message:', error)
    return errorResponse('Failed to create message', 500)
  }
})