import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Order, OrderMessage, AuditLog } from '@prisma/client' // Added
import { queueOrderForSEOWorks } from '@/lib/seoworks/queue'
import { logger } from '@/lib/observability'

export async function GET(request: NextRequest) {
  try {
    // Auth disabled - using default values
    const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@example.com'
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    // Get all orders for this user
    const orders = await prisma.order.findMany({
      where: {
        userEmail: userEmail,
        agencyId: agencyId
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
    logger.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth disabled - using default values
    const userId = process.env.DEFAULT_USER_ID || 'test-user-id'
    const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@example.com'
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

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

    // Create new order
    const order = await prisma.order.create({
      data: {
        taskType,
        title,
        description,
        status: 'pending',
        priority,
        userId: userId,
        userEmail: userEmail,
        agencyId: agencyId,
        estimatedHours: estimatedHours || null,
        keywords: keywords.length > 0 ? JSON.stringify(keywords) : null,
        targetUrl: targetUrl || null,
        wordCount: wordCount || null
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ORDER_CREATED',
        entityType: 'order',
        entityId: order.id,
        userId: userId,
        userEmail: userEmail,
        details: {
          taskType,
          title,
          priority
        }
      }
    })

    // Queue order for SEO Works processing
    try {
      await queueOrderForSEOWorks(order.id)
      logger.info('Order queued for SEO Works', { orderId: order.id })
      
      // Add initial message
      await prisma.orderMessage.create({
        data: {
          orderId: order.id,
          agencyId: agencyId,
          userId: userId,
          type: 'status_update',
          content: 'Your request has been submitted and will be processed shortly.'
        }
      })
    } catch (queueError) {
      logger.error('Failed to queue order for SEO Works', { 
        orderId: order.id, 
        error: queueError 
      })
      // Don't fail the request - order is created, just not sent yet
      
      // Add error message
      await prisma.orderMessage.create({
        data: {
          orderId: order.id,
          agencyId: agencyId,
          userId: userId,
          type: 'status_update',
          content: 'Your request has been created. We will begin processing it shortly.'
        }
      })
    }

    logger.info('Order created successfully', {
      orderId: order.id,
      taskType,
      priority
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
    logger.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}