import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      question,
      aiResponse,
      priority,
      additionalContext,
      contactPreference,
      conversationId
    } = body

    // Validate required fields
    if (!question || !priority) {
      return NextResponse.json(
        { error: 'Missing required fields: question and priority' },
        { status: 400 }
      )
    }

    // Create escalation
    const escalation = await prisma.escalation.create({
      data: {
        userId: session.user.id,
        agencyId: session.user.agencyId!,
        originalQuestion: question,
        aiResponse,
        userContext: additionalContext,
        conversationId,
        contactPreference,
        priority,
        status: 'pending',
        tags: [contactPreference || 'email', 'chat-escalation']
      }
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'ESCALATION_CREATED',
        entityType: 'escalation',
        entityId: escalation.id,
        userId: session.user.id,
        userEmail: session.user.email!,
        details: { priority, contactPreference }
      }
    })

    // TODO: Send notification to SEO team
    // await sendEscalationNotification({
    //   escalation,
    //   user: session.user,
    //   priority
    // })

    return NextResponse.json({
      success: true,
      escalationId: escalation.id,
      message: 'Your question has been sent to our SEO team'
    })
  } catch (error) {
    console.error('Escalation error:', error)
    return NextResponse.json(
      { error: 'Failed to create escalation' },
      { status: 500 }
    )
  }
}

// GET endpoint for checking escalation status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const escalationId = searchParams.get('id')
    const status = searchParams.get('status')

    if (escalationId) {
      // Get specific escalation
      const escalation = await prisma.escalation.findFirst({
        where: {
          id: escalationId,
          userId: session.user.id
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      if (!escalation) {
        return NextResponse.json({ error: 'Escalation not found' }, { status: 404 })
      }

      return NextResponse.json(escalation)
    }

    // Build where clause for list query
    const where: any = {
      userId: session.user.id
    }

    if (status) {
      where.status = status
    }

    // Get all user's escalations
    const escalations = await prisma.escalation.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      escalations,
      total: escalations.length
    })
  } catch (error) {
    console.error('Error fetching escalations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch escalations' },
      { status: 500 }
    )
  }
}

// PATCH endpoint for updating escalation (for admin/SEO team)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { escalationId, status, assignedTo, resolution } = body

    if (!escalationId) {
      return NextResponse.json(
        { error: 'Missing escalationId' },
        { status: 400 }
      )
    }

    // Get the escalation
    const escalation = await prisma.escalation.findUnique({
      where: { id: escalationId }
    })

    if (!escalation) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 })
    }

    // Check permissions (user can only see their own, admin can see all)
    const isAdmin = session.user.isSuperAdmin || session.user.role === 'admin'
    if (!isAdmin && escalation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date()
    }

    if (status) updateData.status = status
    if (assignedTo) {
      updateData.assignedTo = assignedTo
      updateData.assignedAt = new Date()
    }
    if (resolution) {
      updateData.resolution = resolution
      updateData.resolvedAt = new Date()
      updateData.resolvedBy = session.user.email
      updateData.status = 'resolved'
      
      // Calculate resolution time
      const resolutionTime = Math.floor(
        (new Date().getTime() - escalation.createdAt.getTime()) / (1000 * 60)
      )
      updateData.resolutionTime = resolutionTime
    }

    // Update escalation
    const updatedEscalation = await prisma.escalation.update({
      where: { id: escalationId },
      data: updateData
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ESCALATION_UPDATED',
        entityType: 'escalation',
        entityId: escalationId,
        userId: session.user.id,
        userEmail: session.user.email!,
        details: { status, assignedTo, resolution }
      }
    })

    return NextResponse.json({
      success: true,
      escalation: updatedEscalation
    })
  } catch (error) {
    console.error('Error updating escalation:', error)
    return NextResponse.json(
      { error: 'Failed to update escalation' },
      { status: 500 }
    )
  }
}