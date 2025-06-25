import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Validate API key
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key')
  const validApiKey = process.env.SEOWORKS_API_KEY

  if (!validApiKey || !apiKey || apiKey !== validApiKey) {
    return false
  }

  return true
}

// Complete a task
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
    }

    const body = await request.json()
    const { requestId, status, deliverables, completionNotes, actualHours, qualityScore } = body

    // Validate required fields
    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: requestId and status' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: requestId },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id: requestId },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : null,
        deliverables: deliverables ? deliverables : undefined,
        completionNotes: completionNotes || order.completionNotes,
        actualHours: actualHours || order.actualHours,
        qualityScore: qualityScore || order.qualityScore,
        updatedAt: new Date(),
      },
    })

    // Log the update
    await prisma.auditLog.create({
      data: {
        action: 'ORDER_UPDATED',
        entityType: 'order',
        entityId: requestId,
        details: JSON.stringify({
          status,
          updatedBy: 'seoworks-api',
          deliverables: deliverables?.length || 0,
        }),
        userEmail: 'seoworks-api',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        completedAt: updatedOrder.completedAt,
        actualHours: updatedOrder.actualHours,
        qualityScore: updatedOrder.qualityScore,
      },
    })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
