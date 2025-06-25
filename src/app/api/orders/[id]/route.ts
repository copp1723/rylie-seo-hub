import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/observability'
import { z } from 'zod'

// Schema for updating order
const updateOrderSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignedTo: z.string().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  completionNotes: z.string().optional(),
  qualityScore: z.number().min(1).max(5).optional()
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

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        agencyId: agencyId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        seoworksTask: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        taskType: order.taskType,
        title: order.title,
        description: order.description,
        status: order.status,
        priority: order.priority,
        requestedAt: order.createdAt,
        completedAt: order.completedAt,
        assignedTo: order.assignedTo,
        estimatedHours: order.estimatedHours,
        actualHours: order.actualHours,
        deliverables: order.deliverables ? JSON.parse(order.deliverables as string) : [],
        completionNotes: order.completionNotes,
        qualityScore: order.qualityScore,
        keywords: order.keywords ? JSON.parse(order.keywords as string) : [],
        targetUrl: order.targetUrl,
        wordCount: order.wordCount,
        user: order.user,
        messages: order.messages,
        seoworksTask: order.seoworksTask
      }
    })
  } catch (error) {
    logger.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const orderId = params.id
    
    // Auth disabled - using default values
    const userId = process.env.DEFAULT_USER_ID || 'test-user-id'
    const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@example.com'
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    // Parse and validate request body
    const body = await request.json()
    const validation = updateOrderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const updateData = validation.data

    // Check if order exists and belongs to agency
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        agencyId: agencyId
      }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...updateData,
        updatedAt: new Date(),
        completedAt: updateData.status === 'completed' ? new Date() : undefined
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ORDER_UPDATED',
        entityType: 'order',
        entityId: orderId,
        userId: userId,
        userEmail: userEmail,
        details: updateData
      }
    })

    // Create status message if status changed
    if (updateData.status && updateData.status !== existingOrder.status) {
      const statusMessages = {
        pending: 'Order status changed to pending.',
        in_progress: 'Your order is now being processed.',
        completed: 'Your order has been completed!',
        cancelled: 'Your order has been cancelled.'
      }

      await prisma.orderMessage.create({
        data: {
          orderId: orderId,
          agencyId: agencyId,
          userId: userId,
          type: 'status_update',
          content: statusMessages[updateData.status]
        }
      })
    }

    logger.info('Order updated successfully', {
      orderId,
      updates: updateData
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder
    })
  } catch (error) {
    logger.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const orderId = params.id
    
    // Auth disabled - using default values
    const userId = process.env.DEFAULT_USER_ID || 'test-user-id'
    const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@example.com'
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    // Check if order exists and belongs to agency
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        agencyId: agencyId
      }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Soft delete by updating deletedAt
    await prisma.order.update({
      where: { id: orderId },
      data: {
        deletedAt: new Date()
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ORDER_DELETED',
        entityType: 'order',
        entityId: orderId,
        userId: userId,
        userEmail: userEmail,
        details: {
          deletedAt: new Date()
        }
      }
    })

    logger.info('Order deleted successfully', { orderId })

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting order:', error)
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}