import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client' // Corrected import for Prisma namespace
import { queueOrderForSEOWorks } from '@/lib/seoworks/queue'
import { logger } from '@/lib/observability'
import { z } from 'zod' // Import Zod

// Schema for creating order (mirrors fields in POST body)
const createOrderSchema = z.object({
  taskType: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  estimatedHours: z.number().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  keywords: z.array(z.string()).optional().default([]),
  targetUrl: z.string().url().optional(),
  wordCount: z.number().int().positive().optional(),
})

export async function GET() {
  try {
    const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@example.com'
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    const orders = await prisma.order.findMany({
      where: {
        userEmail: userEmail,
        agencyId: agencyId,
        deletedAt: null, // Exclude soft-deleted orders
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        seoworksTask: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
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
        seoworksTaskId: order.seoworksTaskId,
        user: order.user, // Added
        messages: order.messages, // Added
        keywords: order.keywords ? JSON.parse(order.keywords as string) : [], // Added
        targetUrl: order.targetUrl, // Added
        wordCount: order.wordCount, // Added
        seoworksTask: order.seoworksTask, // Added
      })),
    })
  } catch (error) {
    logger.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = process.env.DEFAULT_USER_ID || 'test-user-id'
    const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@example.com'
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    const body = await request.json()
    const validation = createOrderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const {
      taskType,
      title,
      description,
      estimatedHours,
      priority,
      keywords,
      targetUrl,
      wordCount,
    } = validation.data

    const order = await prisma.order.create({
      data: {
        taskType,
        title,
        description,
        status: 'pending',
        priority,
        // userId: userId, // Removed: Order model links to User via userEmail, not userId directly
        userEmail: userEmail,
        agencyId: agencyId,
        estimatedHours: estimatedHours || null,
        keywords: keywords && keywords.length > 0 ? JSON.stringify(keywords) : Prisma.JsonNull,
        targetUrl: targetUrl || null,
        wordCount: wordCount || null,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'ORDER_CREATED',
        entityType: 'order',
        entityId: order.id,
        userId: userId,
        userEmail: userEmail,
        details: { taskType, title, priority },
      },
    })

    try {
      await queueOrderForSEOWorks(order.id)
      logger.info('Order queued for SEO Works', { orderId: order.id })
      await prisma.orderMessage.create({
        data: {
          orderId: order.id,
          agencyId: agencyId,
          userId: userId,
          type: 'status_update',
          content: 'Your request has been submitted and will be processed shortly.',
        },
      })
    } catch (queueError) {
      logger.error('Failed to queue order for SEO Works', {
        orderId: order.id,
        error: queueError,
      })
      await prisma.orderMessage.create({
        data: {
          orderId: order.id,
          agencyId: agencyId,
          userId: userId,
          type: 'status_update',
          content: 'Your request has been created. We will begin processing it shortly.',
        },
      })
    }

    logger.info('Order created successfully', { orderId: order.id, taskType, priority })

    // Return the full order object, including fields that were just set or have defaults
    const createdOrder = await prisma.order.findUnique({ where: { id: order.id }});

    return NextResponse.json({
      success: true,
      order: { // Ensure this structure matches client expectations and Order model
        id: createdOrder?.id,
        taskType: createdOrder?.taskType,
        title: createdOrder?.title,
        description: createdOrder?.description,
        status: createdOrder?.status,
        priority: createdOrder?.priority,
        requestedAt: createdOrder?.createdAt,
        estimatedHours: createdOrder?.estimatedHours,
        keywords: createdOrder?.keywords ? JSON.parse(createdOrder.keywords as string) : [],
        targetUrl: createdOrder?.targetUrl,
        wordCount: createdOrder?.wordCount,
        // Include other relevant fields like user, messages, seoworksTaskId if needed
      },
    })
  } catch (error) {
    logger.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
