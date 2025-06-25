import { NextRequest, NextResponse } from 'next/server'
import { withAgencyContext } from '@/lib/middleware/agency-context'
import { queueOrderForSEOWorks } from '@/lib/seoworks/queue'
import { logger } from '@/lib/observability'

export const GET = withAgencyContext(async (request, context) => {
  try {
    // Use the tenant-filtered database from context
    const orders = await context.db.order.findMany({
      where: {
        userEmail: context.user.email
      },
      include: {
        messages: {
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ 
      success: true,
      orders: orders.map(order => ({
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
        seoworksTaskId: order.seoworksTaskId,
        messages: order.messages,
        keywords: order.keywords ? JSON.parse(order.keywords as string) : [],
        targetUrl: order.targetUrl,
        wordCount: order.wordCount
      }))
    })
  } catch (error) {
    logger.error('Error fetching orders:', {
      error,
      userId: context.user.id,
      agencyId: context.agency.id
    })
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
})

export const POST = withAgencyContext(async (request, context) => {
  try {
    const body = await request.json()
    const { 
      taskType, 
      title, 
      description, 
      estimatedHours,
      priority = 'medium',
      keywords = [],
      targetUrl,
      wordCount
    } = body

    // Validate required fields
    if (!taskType || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: taskType, title, description' },
        { status: 400 }
      )
    }

    // Create new order using tenant-filtered database
    const order = await context.db.order.create({
      data: {
        taskType,
        title,
        description,
        status: 'pending',
        priority,
        userId: context.user.id,
        userEmail: context.user.email,
        estimatedHours: estimatedHours || null,
        keywords: keywords.length > 0 ? JSON.stringify(keywords) : null,
        targetUrl: targetUrl || null,
        wordCount: wordCount || null
      }
    })

    // Create audit log (already includes agencyId from context)
    await context.db.auditLog.create({
      data: {
        action: 'ORDER_CREATED',
        entityType: 'order',
        entityId: order.id,
        userEmail: context.user.email,
        details: {
          taskType,
          title,
          priority,
          userId: context.user.id
        }
      }
    })

    // Queue order for SEO Works processing
    try {
      await queueOrderForSEOWorks(order.id)
      logger.info('Order queued for SEO Works', { 
        orderId: order.id,
        agencyId: context.agency.id
      })
      
      // Add initial message
      await context.db.orderMessage.create({
        data: {
          orderId: order.id,
          userId: context.user.id,
          userEmail: context.user.email,
          type: 'status_update',
          content: 'Your request has been submitted and will be processed shortly.'
        }
      })
    } catch (queueError) {
      logger.error('Failed to queue order for SEO Works', { 
        orderId: order.id,
        agencyId: context.agency.id,
        error: queueError 
      })
      // Don't fail the request - order is created, just not sent yet
      
      // Add error message
      await context.db.orderMessage.create({
        data: {
          orderId: order.id,
          userId: context.user.id,
          userEmail: context.user.email,
          type: 'status_update',
          content: 'Your request has been created. We will begin processing it shortly.'
        }
      })
    }

    logger.info('Order created successfully', {
      orderId: order.id,
      taskType,
      priority,
      agencyId: context.agency.id,
      userId: context.user.id
    })

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
        estimatedHours: order.estimatedHours,
        keywords: keywords,
        targetUrl: order.targetUrl,
        wordCount: order.wordCount
      }
    })
  } catch (error) {
    logger.error('Error creating order:', {
      error,
      userId: context.user.id,
      agencyId: context.agency.id
    })
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
})