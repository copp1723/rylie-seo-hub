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

    // Create mock webhook payload matching the new schema
    const webhookPayload = {
      eventType,
      timestamp: new Date().toISOString(),
      data: {
        externalId: order.seoworksTaskId || `mock-${orderId}-${Date.now()}`,
        taskType: order.taskType || 'general',
        status,
        assignedTo: 'mock-team-member@seoworks.com',
        completionDate: status === 'completed' ? new Date().toISOString() : undefined,
        deliverables:
          status === 'completed'
            ? [
                {
                  type: 'document',
                  url: 'https://example.com/deliverable.pdf',
                  title: `${order.taskType || 'Task'} Deliverable`,
                  description: 'Completed work for your request',
                },
                {
                  type: 'report',
                  url: 'https://example.com/report.html',
                  title: 'Completion Report',
                  description: 'Detailed report of work performed',
                },
              ]
            : undefined,
        completionNotes:
          status === 'completed'
            ? 'Task completed successfully with all requirements met.'
            : status === 'cancelled'
            ? 'Task cancelled per client request.'
            : undefined,
        actualHours: status === 'completed' ? 4.5 : undefined,
        qualityScore: status === 'completed' ? 5 : undefined,
      },
    }

    // Calculate signature
    const secret = process.env.SEOWORKS_WEBHOOK_SECRET || 'test-secret'
    const payload = JSON.stringify(webhookPayload)
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Call our webhook endpoint
    const webhookUrl = new URL('/api/seoworks/webhook', request.url)
    const webhookResponse = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-seoworks-signature': signature,
        'x-api-key': process.env.SEOWORKS_API_KEY || 'test-api-key',
      },
      body: payload,
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
      signature,
    })
  } catch (error) {
    logger.error('Error sending test webhook:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send test webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      }, 
      { status: 500 }
    )
  }
}

// Helper endpoint to list available test scenarios
export async function GET(request: NextRequest) {
  const isMockMode = !process.env.SEOWORKS_API_KEY || process.env.SEOWORKS_MOCK_MODE === 'true'
  
  // Get sample orders for testing
  const sampleOrders = await prisma.order.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      taskType: true,
      status: true,
      seoworksTaskId: true,
    },
  })

  return NextResponse.json({
    success: true,
    description: 'Test endpoint for simulating SEO Works webhooks',
    mode: isMockMode ? 'mock' : 'production',
    usage: 'POST /api/seoworks/test with { orderId, eventType, status }',
    availableEventTypes: ['task.created', 'task.updated', 'task.completed', 'task.cancelled'],
    availableStatuses: ['pending', 'in_progress', 'completed', 'cancelled'],
    sampleOrders: sampleOrders.length > 0 ? sampleOrders : [
      {
        id: 'example-order-id',
        title: 'Example Order',
        taskType: 'blog',
        status: 'pending',
        seoworksTaskId: null,
      },
    ],
    examples: [
      {
        description: 'Create a new task',
        payload: {
          orderId: 'your-order-id',
          eventType: 'task.created',
          status: 'pending',
        },
      },
      {
        description: 'Mark order as in progress',
        payload: {
          orderId: 'your-order-id',
          eventType: 'task.updated',
          status: 'in_progress',
        },
      },
      {
        description: 'Complete an order with deliverables',
        payload: {
          orderId: 'your-order-id',
          eventType: 'task.completed',
          status: 'completed',
        },
      },
      {
        description: 'Cancel an order',
        payload: {
          orderId: 'your-order-id',
          eventType: 'task.cancelled',
          status: 'cancelled',
        },
      },
    ],
    testCommand: `curl -X POST ${process.env.APP_URL || 'http://localhost:3001'}/api/seoworks/test \\
  -H "Content-Type: application/json" \\
  -d '{"orderId": "your-order-id", "eventType": "task.updated", "status": "in_progress"}'`,
  })
}