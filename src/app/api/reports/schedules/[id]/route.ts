import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import cronParser from 'cron-parser'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const scheduleId = params.id

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true, isSuperAdmin: true },
    })

    if (!user || (!user.agencyId && !user.isSuperAdmin)) {
      return NextResponse.json({ error: 'User not associated with an agency or not authorized' }, { status: 403 })
    }

    const schedule = await prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Super admin can access any schedule, otherwise check agencyId
    if (!user.isSuperAdmin && schedule.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(schedule)
  } catch (error: any) {
    console.error('Error fetching report schedule:', error)
    return NextResponse.json({ error: `Failed to fetch report schedule: ${error.message || 'Unknown error'}` }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { reportType, cronPattern, emailRecipients, isActive, brandingOptionsJson } = body
    const scheduleId = params.id

    if (cronPattern) {
      try {
        cronParser.parseExpression(cronPattern)
      } catch (err) {
        return NextResponse.json({ error: 'Invalid cronPattern format' }, { status: 400 })
      }
    }

    // Get user's agency
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    })

    if (!user?.agencyId) {
      return NextResponse.json({ 
        error: 'User not associated with an agency' 
      }, { status: 400 })
    }

    // Verify schedule belongs to user's agency (or user is super admin)
    const existingSchedule = await prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
    })

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (!session.user.isSuperAdmin && existingSchedule.agencyId !== user.agencyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const updateData: any = {}
    if (reportType !== undefined) updateData.reportType = reportType
    if (cronPattern !== undefined) {
      updateData.cronPattern = cronPattern
      updateData.nextRun = cronParser.parseExpression(cronPattern).next().toDate()
    }
    if (emailRecipients !== undefined) updateData.emailRecipients = emailRecipients
    if (isActive !== undefined) updateData.isActive = isActive
    // Reset status to active if crucial parts of schedule are changed by user
    if (isActive === true && (cronPattern || reportType || emailRecipients)) {
        updateData.status = 'active';
        updateData.lastErrorMessage = null;
    }
    if (brandingOptionsJson !== undefined) updateData.brandingOptionsJson = brandingOptionsJson

    const updatedSchedule = await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: updateData,
    })

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_REPORT_SCHEDULE',
        entityType: 'ReportSchedule',
        entityId: updatedSchedule.id,
        userId: session.user.id,
        userEmail: session.user.email || '',
        details: { scheduleId: updatedSchedule.id, changes: body },
      },
    })

    return NextResponse.json(updatedSchedule)
  } catch (error: any) {
    console.error('Error updating report schedule:', error)
    if (error.code === 'P2025') { // Record not found for update
        return NextResponse.json({ error: 'Schedule not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: `Failed to update report schedule: ${error.message || 'Unknown error'}` }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const scheduleId = params.id

    // Get user's agency
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true, isSuperAdmin: true },
    })

    if (!user || (!user.agencyId && !user.isSuperAdmin)) {
      return NextResponse.json({ error: 'User not associated with an agency or not authorized' }, { status: 403 })
    }

    // Verify schedule belongs to user's agency (or user is super admin)
    const scheduleToDelete = await prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
    })

    if (!scheduleToDelete) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (!user.isSuperAdmin && scheduleToDelete.agencyId !== user.agencyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.reportSchedule.delete({
      where: { id: scheduleId },
    })

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_REPORT_SCHEDULE',
        entityType: 'ReportSchedule',
        entityId: scheduleId, // The ID of the deleted schedule
        userId: session.user.id,
        userEmail: session.user.email || '',
        details: { scheduleId },
      },
    })

    return NextResponse.json({ success: true, message: 'Report schedule deleted successfully' }, { status: 200 })
  } catch (error: any) {
    console.error('Error deleting report schedule:', error)
    if (error.code === 'P2025') { // Record to delete not found
        return NextResponse.json({ error: 'Schedule not found for deletion.' }, { status: 404 });
    }
    return NextResponse.json({ error: `Failed to delete report schedule: ${error.message || 'Unknown error'}` }, { status: 500 })
  }
}

// Removed old calculateNextRun