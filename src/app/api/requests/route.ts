import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const taskType = searchParams.get('taskType')
    const priority = searchParams.get('priority')
    const taskCategory = searchParams.get('taskCategory')

    // Build where clause
    const where: any = {
      userEmail: session.user.email,
      deletedAt: null, // Exclude soft-deleted orders
    }

    // Add filters if provided
    if (status && status !== 'all') {
      where.status = status
    }

    if (taskType && taskType !== 'all') {
      where.taskType = taskType
    }

    if (priority && priority !== 'all') {
      where.priority = priority
    }

    if (taskCategory && taskCategory !== 'all') {
      where.taskCategory = taskCategory
    }

    // If user has an agency, filter by agency
    if (session.user.agencyId) {
      where.agencyId = session.user.agencyId
    }

    // Fetch orders with related data
    const orders = await prisma.order.findMany({
      where,
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1 // Get latest message
        },
        deliverableFiles: true,
        timeEntries: {
          select: {
            hours: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform orders to include computed fields
    const transformedOrders = orders.map(order => ({
      ...order,
      keywords: order.keywords ? (order.keywords as string[]) : [],
      deliverables: order.deliverables ? order.deliverables : null,
      totalHours: order.timeEntries.reduce((sum, entry) => sum + entry.hours, 0),
      latestMessage: order.messages[0] || null,
    }))

    return NextResponse.json({ 
      orders: transformedOrders, // Keep 'orders' for backward compatibility
      requests: transformedOrders, // New field name
      total: orders.length 
    })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    const { title, description, taskType, priority = 'medium' } = body

    if (!title || !description || !taskType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, taskType' },
        { status: 400 }
      )
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        title,
        description,
        taskType,
        priority,
        userEmail: session.user.email!,
        userId: session.user.id,
        agencyId: session.user.agencyId,
        status: 'pending',
        keywords: body.keywords || [],
        targetUrl: body.targetUrl,
        wordCount: body.wordCount,
        estimatedHours: body.estimatedHours,
        pageTitle: body.pageTitle,
        contentUrl: body.contentUrl,
        taskCategory: body.taskCategory,
      }
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'ORDER_CREATED',
        entityType: 'order',
        entityId: order.id,
        userId: session.user.id!,
        userEmail: session.user.email!,
        details: {
          title: order.title,
          taskType: order.taskType,
          priority: order.priority
        }
      }
    })

    return NextResponse.json({ order }, { status: 201 })

  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}