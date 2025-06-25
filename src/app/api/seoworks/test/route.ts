import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/observability'
import crypto from 'crypto'

// This endpoint simulates SEO Works sending webhooks
// For testing the integration without actual SEO Works API

export async function POST(request: NextRequest) {
  try {
    const { orderId, eventType = 'task.updated', status = 'in_progress' } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    // Find the order to get its SEO Works task ID
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Create mock webhook payload
    const webhookPayload = {
      eventType,
      timestamp: new Date().toISOString(),
      signature: '', // Will be calculated below
      data: {
        externalId: order.seoworksTaskId || `mock-${orderId}`,
        taskType: order.taskType,
        status,
        assignedTo: 'mock-team-member@seoworks.com',
        completionDate: status === 'completed' ? new Date().toISOString() : undefined,
        deliverables:
          status === 'completed'
            ? [
                {
                  type: 'document',
                  url: 'https://example.com/deliverable.pdf',
                  title: `${order.taskType} Deliverable`,
                  description: 'Completed work for your request',
                },
              ]
            : undefined,
        completionNotes:
          status === 'completed'
            ? 'Task completed successfully with all requirements met.'
            : undefined,
        actualHours: status === 'completed' ? 4.5 : undefined,
        qualityScore: status === 'completed' ? 5 : undefined,
      },
    }

    // Calculate signature
    const secret = process.env.SEOWORKS_WEBHOOK_SECRET || 'test-secret'
    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(webhookPayload))
      .digest('hex')

    webhookPayload.signature = signature

    // Call our webhook endpoint
    const webhookUrl = new URL('/api/seoworks/webhook', request.url)
    const webhookResponse = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-seoworks-signature': signature,
      },
      body: JSON.stringify(webhookPayload),
    })

    const result = await webhookResponse.json()

    logger.info('Test webhook sent', {
      orderId,
      eventType,
      status,
      webhookResponse: webhookResponse.status,
    })

    return NextResponse.json({
      success: true,
      message: 'Test webhook sent',
      webhookPayload,
      webhookResponse: {
        status: webhookResponse.status,
        result,
      },
    })
  } catch (error) {
    logger.error('Error sending test webhook:', error)
    return NextResponse.json({ error: 'Failed to send test webhook' }, { status: 500 })
  }
}

// Helper endpoint to list available test scenarios
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    description: 'Test endpoint for simulating SEO Works webhooks',
    usage: 'POST /api/seoworks/test with { orderId, eventType, status }',
    availableEventTypes: ['task.created', 'task.updated', 'task.completed', 'task.cancelled'],
    availableStatuses: ['pending', 'in_progress', 'completed', 'cancelled'],
    examples: [
      {
        description: 'Mark order as in progress',
        payload: {
          orderId: 'your-order-id',
          eventType: 'task.updated',
          status: 'in_progress',
        },
      },
      {
        description: 'Complete an order',
        payload: {
          orderId: 'your-order-id',
          eventType: 'task.completed',
          status: 'completed',
        },
      },
    ],
  })
}
