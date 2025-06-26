import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logGA4AuthEvent, AuditAction } from '@/lib/audit'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

const pauseSchema = z.object({
  reason: z.string().optional()
})

// Pause a schedule
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    const { id: scheduleId } = params
    const body = await request.json()
    const { reason } = pauseSchema.parse(body)

    // Fetch schedule
    const schedule = await prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
      include: { agency: true }
    })

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canPause = session.user.isSuperAdmin || 
      (session.user.role === 'admin' && session.user.agencyId === schedule.agencyId) ||
      session.user.id === schedule.userId

    if (!canPause) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Update schedule
    const updated = await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        isPaused: true,
        pausedReason: reason || 'Manually paused by user'
      }
    })

    // Log action
    await logGA4AuthEvent(
      AuditAction.GA4_REPORT_SCHEDULE_PAUSED,
      session.user.id,
      session.user.email || 'unknown',
      {
        scheduleId,
        reason: reason || 'Manual pause'
      }
    )

    return NextResponse.json({
      success: true,
      schedule: updated
    })
  } catch (error) {
    console.error('Error pausing schedule:', error)
    return NextResponse.json(
      { error: 'Failed to pause schedule' },
      { status: 500 }
    )
  }
}

// Resume a paused schedule
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    const { id: scheduleId } = params

    // Fetch schedule
    const schedule = await prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
      include: { agency: true }
    })

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canResume = session.user.isSuperAdmin || 
      (session.user.role === 'admin' && session.user.agencyId === schedule.agencyId) ||
      session.user.id === schedule.userId

    if (!canResume) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Update schedule
    const updated = await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        isPaused: false,
        pausedReason: null,
        consecutiveFailures: 0 // Reset failure count on manual resume
      }
    })

    // Log action
    await logGA4AuthEvent(
      AuditAction.GA4_REPORT_SCHEDULE_RESUMED,
      session.user.id,
      session.user.email || 'unknown',
      {
        scheduleId,
        reason: 'Manual resume'
      }
    )

    return NextResponse.json({
      success: true,
      schedule: updated
    })
  } catch (error) {
    console.error('Error resuming schedule:', error)
    return NextResponse.json(
      { error: 'Failed to resume schedule' },
      { status: 500 }
    )
  }
}