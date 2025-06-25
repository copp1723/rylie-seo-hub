import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/observability'
import { z } from 'zod'

// Schema for updating order
const updateOrderSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(), // Added priority
  assignedTo: z.string().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  completionNotes: z.string().optional(),
  qualityScore: z.number().min(1).max(5).optional(),
  keywords: z.array(z.string()).optional(), // Added keywords
  targetUrl: z.string().url().optional(), // Added targetUrl
  wordCount: z.number().int().positive().optional(), // Added wordCount
})

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const orderId = params.id
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    const order = await prisma.order.findFirst({
      where: { id: orderId, agencyId: agencyId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        seoworksTask: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        taskType: order.taskType,
        title: order.title,
        description: order.description,
        status: order.status,
        priority: order.priority, // Added
        requestedAt: order.createdAt,
        completedAt: order.completedAt,
        assignedTo: order.assignedTo,
        estimatedHours: order.estimatedHours,
        actualHours: order.actualHours,
        deliverables: order.deliverables ? JSON.parse(order.deliverables as string) : [],
        completionNotes: order.completionNotes,
        qualityScore: order.qualityScore,
        keywords: order.keywords ? JSON.parse(order.keywords as string) : [], // Added
        targetUrl: order.targetUrl, // Added
        wordCount: order.wordCount, // Added
        user: order.user,
        messages: order.messages,
        seoworksTaskId: order.seoworksTaskId, // Corrected: use the ID
        seoworksTask: order.seoworksTask, // The actual task object if needed by frontend
      },
    })
  } catch (error) {
    logger.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const orderId = params.id
    const userId = process.env.DEFAULT_USER_ID || 'test-user-id'
    const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@example.com'
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    const body = await request.json()
    const validation = updateOrderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { keywords, ...updateDataRest } = validation.data
    const updatePayload: any = { ...updateDataRest }

    if (keywords !== undefined) {
      updatePayload.keywords = keywords.length > 0 ? JSON.stringify(keywords) : null;
    }


    const existingOrder = await prisma.order.findFirst({
      where: { id: orderId, agencyId: agencyId },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...updatePayload,
        updatedAt: new Date(),
        completedAt: updatePayload.status === 'completed' ? new Date() : undefined,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'ORDER_UPDATED',
        entityType: 'order',
        entityId: orderId,
        userId: userId,
        userEmail: userEmail,
        details: validation.data, // Log the original validated data
      },
    })

    if (updatePayload.status && updatePayload.status !== existingOrder.status) {
      const statusMessages: { [key: string]: string } = {
        pending: 'Order status changed to pending.',
        in_progress: 'Your order is now being processed.',
        completed: 'Your order has been completed!',
        cancelled: 'Your order has been cancelled.',
      }
      await prisma.orderMessage.create({
        data: {
          orderId: orderId,
          agencyId: agencyId,
          userId: userId,
          type: 'status_update',
          content: statusMessages[updatePayload.status as keyof typeof statusMessages],
        },
      })
    }

    logger.info('Order updated successfully', { orderId, updates: validation.data })
    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    logger.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const orderId = params.id
    const userId = process.env.DEFAULT_USER_ID || 'test-user-id'
    const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@example.com'
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    const existingOrder = await prisma.order.findFirst({
      where: { id: orderId, agencyId: agencyId },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { deletedAt: new Date() }, // This should now be valid
    })

    await prisma.auditLog.create({
      data: {
        action: 'ORDER_DELETED',
        entityType: 'order',
        entityId: orderId,
        userId: userId,
        userEmail: userEmail,
        details: { deletedAt: new Date() },
      },
    })

    logger.info('Order deleted successfully', { orderId })
    return NextResponse.json({ success: true, message: 'Order deleted successfully' })
  } catch (error) {
    logger.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
