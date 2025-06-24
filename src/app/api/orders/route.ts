import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withAuth, successResponse, errorResponse } from '@/lib/api/route-handler'

// Validation schemas
const createOrderSchema = z.object({
  taskType: z.enum(['blog-post', 'landing-page', 'meta-description', 'custom']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  wordCount: z.number().optional(),
  keywords: z.array(z.string()).optional(),
  deadline: z.string().datetime().optional()
})

// GET /api/orders - List all orders
export const GET = withAuth(async (request, { user, tenant }) => {
  try {
    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Build where clause
    const where: any = {
      userEmail: user.email,
      agencyId: tenant.agencyId
    }
    
    if (status) {
      where.status = status.toUpperCase()
    }
    
    // Fetch orders with pagination
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { messages: true }
          }
        }
      }),
      prisma.order.count({ where })
    ])
    
    return successResponse({
      orders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return errorResponse('Failed to fetch orders', 500)
  }
})

// POST /api/orders - Create new order
export const POST = withAuth(async (request, { user, tenant }) => {
  try {
    // Parse and validate body
    const body = await request.json()
    const validatedData = createOrderSchema.parse(body)
    
    // Create order
    const order = await prisma.order.create({
      data: {
        ...validatedData,
        userEmail: user.email,
        agencyId: tenant.agencyId,
        status: 'PENDING',
        keywords: validatedData.keywords || [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    // TODO: Send email notification
    // await sendOrderNotification(order)
    
    return successResponse({ order }, 'Order created successfully', 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400, error.errors)
    }
    
    console.error('Orders POST error:', error)
    return errorResponse('Failed to create order', 500)
  }
})