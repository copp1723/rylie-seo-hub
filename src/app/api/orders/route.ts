import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all orders for this user
    const orders = await prisma.order.findMany({
      where: {
        userEmail: session.user.email
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
        requestedAt: order.createdAt,
        completedAt: order.completedAt,
        assignedTo: order.assignedTo,
        estimatedHours: order.estimatedHours,
        actualHours: order.actualHours,
        deliverables: order.deliverables ? JSON.parse(order.deliverables as string) : [],
        completionNotes: order.completionNotes,
        qualityScore: order.qualityScore
      }))
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskType, title, description, estimatedHours } = body

    // Create new order
    const order = await prisma.order.create({
      data: {
        taskType,
        title,
        description,
        status: 'pending',
        userEmail: session.user.email,
        estimatedHours: estimatedHours || null
      }
    })

    return NextResponse.json({ 
      success: true,
      order: {
        id: order.id,
        taskType: order.taskType,
        title: order.title,
        description: order.description,
        status: order.status,
        requestedAt: order.createdAt,
        estimatedHours: order.estimatedHours
      }
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}