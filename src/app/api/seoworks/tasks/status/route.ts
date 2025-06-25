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

// Get task status
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    const status = searchParams.get('status')
    const taskType = searchParams.get('taskType')

    // Build query
    const where: any = {}
    if (requestId) where.id = requestId
    if (status) where.status = status
    if (taskType) where.taskType = taskType

    // Get orders
    const orders = await prisma.order.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit results
    })

    return NextResponse.json({
      success: true,
      count: orders.length,
      tasks: orders.map(order => ({
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
        qualityScore: order.qualityScore,
      })),
    })
  } catch (error) {
    console.error('Error fetching task status:', error)
    return NextResponse.json({ error: 'Failed to fetch task status' }, { status: 500 })
  }
}
