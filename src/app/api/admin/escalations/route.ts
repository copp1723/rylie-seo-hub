import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const isAdmin = session.user.isSuperAdmin || session.user.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assignedTo = searchParams.get('assignedTo')

    // Build where clause
    const where: any = {}
    
    if (status && status !== 'all') {
      where.status = status
    }
    
    if (priority) {
      where.priority = priority
    }
    
    if (assignedTo) {
      where.assignedTo = assignedTo
    }

    // Get escalations with user data
    const escalations = await prisma.escalation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        agency: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [
        {
          priority: 'desc', // Urgent first
        },
        {
          createdAt: 'desc'
        }
      ]
    })

    // Calculate stats
    const stats = {
      total: escalations.length,
      pending: escalations.filter(e => e.status === 'pending').length,
      assigned: escalations.filter(e => e.status === 'assigned').length,
      in_progress: escalations.filter(e => e.status === 'in_progress').length,
      resolved: escalations.filter(e => e.status === 'resolved').length,
      urgent: escalations.filter(e => e.priority === 'urgent').length,
      high: escalations.filter(e => e.priority === 'high').length,
    }

    return NextResponse.json({
      escalations,
      stats
    })
  } catch (error) {
    console.error('Error fetching admin escalations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch escalations' },
      { status: 500 }
    )
  }
}