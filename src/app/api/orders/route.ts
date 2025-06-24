import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/api/route-handler'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateRequest } from '@/lib/validation'
import { logger, trackEvent } from '@/lib/observability'
import { checkPlanLimits } from '@/lib/auth/user-resolver'

// Schema for creating order
const createOrderSchema = z.object({
  taskType: z.enum(['blog', 'page', 'gbp', 'maintenance', 'seo', 'seo_audit']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  estimatedHours: z.number().positive().optional(),
  keywords: z.array(z.string()).optional(),
  targetUrl: z.string().url().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
})

// GET all orders
export const GET = withAuth(async (request, { user, tenant }) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build query conditions
    const where: any = {
      agencyId: tenant.agencyId,
      deletedAt: null
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      where.status = status
    }

    // Non-admin users can only see their own orders
    if (!user.isSuperAdmin && user.role !== 'ADMIN') {
      where.userId = user.id
    }

    // Get total count for pagination
    const totalCount = await prisma.order.count({ where })

    // Get orders with pagination
    const orders = await prisma.order.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        messages: {
          select: {
            id: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

    // Transform orders for response
    const transformedOrders = orders.map(order => ({
      id: order.id,
      taskType: order.taskType,
      title: order.title,
      description: order.description,
      status: order.status,
      priority: order.priority || 'medium',
      requestedAt: order.createdAt,
      completedAt: order.completedAt,
      assignedTo: order.assignedTo,
      estimatedHours: order.estimatedHours,
      actualHours: order.actualHours,
      deliverables: order.deliverables ? JSON.parse(order.deliverables as string) : [],
      completionNotes: order.completionNotes,
      qualityScore: order.qualityScore,
      keywords: order.keywords ? JSON.parse(order.keywords as string) : [],
      wordCount: order.wordCount,
      user: order.user,
      hasMessages: order.messages.length > 0,
      lastMessageAt: order.messages[0]?.createdAt
    }))

    logger.info('Orders fetched successfully', {
      userId: user.id,
      agencyId: tenant.agencyId,
      count: orders.length,
      totalCount
    })

    return successResponse({
      orders: transformedOrders,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })
  } catch (error) {
    logger.error('Error fetching orders:', error)
    return errorResponse('Failed to fetch orders', 500)
  }
})

// POST create new order
export const POST = withAuth(async (request, { user, tenant }) => {
  try {
    // Check plan limits
    const orderLimits = await checkPlanLimits(user, 'orders')
    if (!orderLimits.allowed) {
      logger.warn('Order limit exceeded', {
        agencyId: tenant.agencyId,
        current: orderLimits.current,
        limit: orderLimits.limit
      })
      return errorResponse(
        `Monthly order limit reached (${orderLimits.limit}). Please upgrade your plan.`,
        429,
        { current: orderLimits.current, limit: orderLimits.limit }
      )
    }

    // Validate request body
    const body = await request.json()
    const validation = validateRequest(createOrderSchema, body)

    if (!validation.success) {
      return errorResponse(validation.error, 400, validation.details)
    }

    const { taskType, title, description, estimatedHours, keywords, targetUrl, priority } = validation.data

    // Create new order
    const order = await prisma.order.create({
      data: {
        taskType,
        title,
        description,
        status: 'pending',
        priority,
        userId: user.id,
        agencyId: tenant.agencyId,
        estimatedHours: estimatedHours || null,
        keywords: keywords ? JSON.stringify(keywords) : null,
        targetUrl: targetUrl || null
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ORDER_CREATED',
        entityType: 'order',
        entityId: order.id,
        userId: user.id,
        details: {
          taskType,
          title,
          createdBy: user.email
        }
      }
    })

    // Send notification email (if configured)
    if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true') {
      // TODO: Implement email notification
      logger.info('Email notification would be sent here', {
        orderId: order.id,
        userEmail: user.email
      })
    }

    // Track event
    trackEvent('order_created', {
      order_id: order.id,
      user_id: user.id,
      agency_id: tenant.agencyId,
      task_type: taskType,
      priority: priority
    })

    logger.info('Order created successfully', {
      orderId: order.id,
      userId: user.id,
      taskType
    })

    return successResponse({
      id: order.id,
      taskType: order.taskType,
      title: order.title,
      description: order.description,
      status: order.status,
      priority: order.priority,
      requestedAt: order.createdAt,
      estimatedHours: order.estimatedHours,
      keywords: keywords || [],
      targetUrl: order.targetUrl
    }, 'Order created successfully', 201)
  } catch (error) {
    logger.error('Error creating order:', error)
    return errorResponse('Failed to create order', 500)
  }
})