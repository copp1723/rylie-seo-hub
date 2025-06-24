import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse, getRouteParams } from '@/lib/api/route-handler'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateRequest } from '@/lib/validation'
import { logger, trackEvent } from '@/lib/observability'

// Schema for updating order
const updateOrderSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  assignedTo: z.string().optional(),
  actualHours: z.number().positive().optional(),
  deliverables: z.array(z.object({
    type: z.string(),
    url: z.string().url(),
    description: z.string(),
    uploadedAt: z.string().datetime()
  })).optional(),
  completionNotes: z.string().optional(),
  qualityScore: z.number().min(1).max(5).optional()
})

// GET single order
export const GET = withAuth(async (request, { user, tenant }, context) => {
  const { id } = getRouteParams<{ id: string }>(context)

  try {
    const order = await prisma.order.findFirst({
      where: {
        id,
        agencyId: tenant.agencyId,
        deletedAt: null
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!order) {
      return errorResponse('Order not found', 404)
    }

    // Check if user has permission to view this order
    if (!user.isSuperAdmin && order.userId !== user.id && user.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    return successResponse({
      ...order,
      deliverables: order.deliverables ? JSON.parse(order.deliverables as string) : []
    })
  } catch (error) {
    logger.error('Error fetching order:', error)
    return errorResponse('Failed to fetch order', 500)
  }
})

// PATCH update order
export const PATCH = withAuth(async (request, { user, tenant }, context) => {
  const { id } = getRouteParams<{ id: string }>(context)

  try {
    // Check if order exists and user has permission
    const existingOrder = await prisma.order.findFirst({
      where: {
        id,
        agencyId: tenant.agencyId,
        deletedAt: null
      }
    })

    if (!existingOrder) {
      return errorResponse('Order not found', 404)
    }

    // Only admins and super admins can update orders
    if (!user.isSuperAdmin && user.role !== 'ADMIN') {
      return errorResponse('Only admins can update orders', 403)
    }

    // Validate request body
    const body = await request.json()
    const validation = validateRequest(updateOrderSchema, body)

    if (!validation.success) {
      return errorResponse(validation.error, 400, validation.details)
    }

    const updateData = validation.data
    const dataToUpdate: any = {}

    // Handle status transitions
    if (updateData.status && updateData.status !== existingOrder.status) {
      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        pending: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'cancelled', 'pending'],
        completed: ['in_progress'], // Allow reopening
        cancelled: ['pending'] // Allow reactivating
      }

      if (!validTransitions[existingOrder.status]?.includes(updateData.status)) {
        return errorResponse(
          `Invalid status transition from ${existingOrder.status} to ${updateData.status}`,
          400
        )
      }

      dataToUpdate.status = updateData.status

      // Set timestamps based on status
      if (updateData.status === 'completed') {
        dataToUpdate.completedAt = new Date()
      } else if (updateData.status === 'in_progress' && existingOrder.status === 'pending') {
        dataToUpdate.startedAt = new Date()
      }

      // Create audit log for status change
      await prisma.auditLog.create({
        data: {
          action: 'ORDER_STATUS_CHANGED',
          entityType: 'order',
          entityId: id,
          userId: user.id,
          details: {
            fromStatus: existingOrder.status,
            toStatus: updateData.status,
            changedBy: user.email
          }
        }
      })

      // Track status change event
      trackEvent('order_status_changed', {
        order_id: id,
        agency_id: tenant.agencyId,
        from_status: existingOrder.status,
        to_status: updateData.status,
        changed_by: user.id
      })
    }

    // Handle other updates
    if (updateData.assignedTo !== undefined) {
      dataToUpdate.assignedTo = updateData.assignedTo
    }

    if (updateData.actualHours !== undefined) {
      dataToUpdate.actualHours = updateData.actualHours
    }

    if (updateData.deliverables !== undefined) {
      dataToUpdate.deliverables = JSON.stringify(updateData.deliverables)
    }

    if (updateData.completionNotes !== undefined) {
      dataToUpdate.completionNotes = updateData.completionNotes
    }

    if (updateData.qualityScore !== undefined) {
      dataToUpdate.qualityScore = updateData.qualityScore
    }

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        ...dataToUpdate,
        updatedAt: new Date()
      }
    })

    // Create order message if there are notes
    if (updateData.completionNotes && updateData.status === 'completed') {
      await prisma.orderMessage.create({
        data: {
          orderId: id,
          userId: user.id,
          content: updateData.completionNotes,
          type: 'completion_note'
        }
      })
    }

    logger.info('Order updated successfully', {
      orderId: id,
      updatedBy: user.id,
      changes: Object.keys(dataToUpdate)
    })

    return successResponse({
      ...updatedOrder,
      deliverables: updatedOrder.deliverables ? JSON.parse(updatedOrder.deliverables as string) : []
    }, 'Order updated successfully')
  } catch (error) {
    logger.error('Error updating order:', error)
    return errorResponse('Failed to update order', 500)
  }
})

// DELETE order (soft delete)
export const DELETE = withAuth(async (request, { user, tenant }, context) => {
  const { id } = getRouteParams<{ id: string }>(context)

  try {
    // Check if order exists
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

    // Only admins and the order creator can delete
    if (!user.isSuperAdmin && user.role !== 'ADMIN' && order.userId !== user.id) {
      return errorResponse('Forbidden', 403)
    }

    // Soft delete the order
    await prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ORDER_DELETED',
        entityType: 'order',
        entityId: id,
        userId: user.id,
        details: {
          deletedBy: user.email,
          orderTitle: order.title
        }
      }
    })

    logger.info('Order deleted successfully', {
      orderId: id,
      deletedBy: user.id
    })

    return successResponse({ id }, 'Order deleted successfully')
  } catch (error) {
    logger.error('Error deleting order:', error)
    return errorResponse('Failed to delete order', 500)
  }
})