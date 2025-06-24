import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse, getRouteParams } from '@/lib/api/route-handler'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/observability'

// Mock upload handler - in production, this would integrate with Cloudinary or S3
async function handleFileUpload(file: File, orderId: string): Promise<{
  url: string
  type: string
  size: number
  filename: string
}> {
  // TODO: Implement actual file upload to Cloudinary/S3
  // For now, return mock data
  logger.info('Mock file upload', {
    filename: file.name,
    size: file.size,
    type: file.type,
    orderId
  })

  return {
    url: `https://example.com/uploads/${orderId}/${file.name}`,
    type: file.type,
    size: file.size,
    filename: file.name
  }
}

// POST upload file for order
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

    // Only admins can upload deliverables
    if (!user.isSuperAdmin && user.role !== 'ADMIN') {
      return errorResponse('Only admins can upload deliverables', 403)
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string || ''

    if (!file) {
      return errorResponse('No file provided', 400)
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return errorResponse('File size must be less than 10MB', 400)
    }

    // Handle file upload
    const uploadResult = await handleFileUpload(file, id)

    // Get existing deliverables
    const existingDeliverables = order.deliverables 
      ? JSON.parse(order.deliverables as string) 
      : []

    // Add new deliverable
    const newDeliverable = {
      id: `del_${Date.now()}`,
      type: uploadResult.type.startsWith('image/') ? 'image' : 'document',
      url: uploadResult.url,
      filename: uploadResult.filename,
      size: uploadResult.size,
      description,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.id
    }

    const updatedDeliverables = [...existingDeliverables, newDeliverable]

    // Update order with new deliverable
    await prisma.order.update({
      where: { id },
      data: {
        deliverables: JSON.stringify(updatedDeliverables)
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELIVERABLE_UPLOADED',
        entityType: 'order',
        entityId: id,
        userId: user.id,
        details: {
          filename: uploadResult.filename,
          size: uploadResult.size,
          type: uploadResult.type
        }
      }
    })

    // Add a message about the upload
    await prisma.orderMessage.create({
      data: {
        orderId: id,
        userId: user.id,
        content: `Uploaded deliverable: ${uploadResult.filename}`,
        type: 'status_update'
      }
    })

    logger.info('Deliverable uploaded successfully', {
      orderId: id,
      filename: uploadResult.filename,
      uploadedBy: user.id
    })

    return successResponse({
      deliverable: newDeliverable
    }, 'File uploaded successfully')
  } catch (error) {
    logger.error('Error uploading file:', error)
    return errorResponse('Failed to upload file', 500)
  }
})

// DELETE remove a deliverable
export const DELETE = withAuth(async (request, { user, tenant }, context) => {
  const { id } = getRouteParams<{ id: string }>(context)

  try {
    const { searchParams } = new URL(request.url)
    const deliverableId = searchParams.get('deliverableId')

    if (!deliverableId) {
      return errorResponse('Deliverable ID is required', 400)
    }

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

    // Only admins can delete deliverables
    if (!user.isSuperAdmin && user.role !== 'ADMIN') {
      return errorResponse('Only admins can delete deliverables', 403)
    }

    // Get existing deliverables
    const deliverables = order.deliverables 
      ? JSON.parse(order.deliverables as string) 
      : []

    // Filter out the deliverable to delete
    const updatedDeliverables = deliverables.filter(
      (d: any) => d.id !== deliverableId
    )

    if (deliverables.length === updatedDeliverables.length) {
      return errorResponse('Deliverable not found', 404)
    }

    // Update order
    await prisma.order.update({
      where: { id },
      data: {
        deliverables: JSON.stringify(updatedDeliverables)
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELIVERABLE_DELETED',
        entityType: 'order',
        entityId: id,
        userId: user.id,
        details: {
          deliverableId,
          deletedBy: user.email
        }
      }
    })

    logger.info('Deliverable deleted successfully', {
      orderId: id,
      deliverableId,
      deletedBy: user.id
    })

    return successResponse({ deliverableId }, 'Deliverable deleted successfully')
  } catch (error) {
    logger.error('Error deleting deliverable:', error)
    return errorResponse('Failed to delete deliverable', 500)
  }
})