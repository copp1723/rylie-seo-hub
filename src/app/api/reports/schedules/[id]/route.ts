import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const { reportType, cronPattern, emailRecipients, isActive, brandingOptionsJson } = await request.json()
    const scheduleId = params.id

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

    // Verify schedule belongs to user's agency
    const existingSchedule = await prisma.reportSchedule.findFirst({
      where: { 
        id: scheduleId,
        agencyId: user.agencyId,
      },
    })

    if (!existingSchedule) {
      return NextResponse.json({ 
        error: 'Schedule not found' 
      }, { status: 404 })
    }

    // Calculate next run if cron pattern changed
    const nextRun = cronPattern && cronPattern !== existingSchedule.cronPattern 
      ? calculateNextRun(cronPattern) 
      : existingSchedule.nextRun

    const updateData: any = {}
    
    if (reportType !== undefined) updateData.reportType = reportType
    if (cronPattern !== undefined) {
      updateData.cronPattern = cronPattern
      updateData.nextRun = nextRun
    }
    if (emailRecipients !== undefined) updateData.emailRecipients = emailRecipients
    if (isActive !== undefined) updateData.isActive = isActive
    if (brandingOptionsJson !== undefined) updateData.brandingOptionsJson = brandingOptionsJson

    const schedule = await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: updateData,
    })

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error('Error updating report schedule:', error)
    return NextResponse.json({ 
      error: 'Failed to update report schedule' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const scheduleId = params.id

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

    // Verify schedule belongs to user's agency
    const existingSchedule = await prisma.reportSchedule.findFirst({
      where: { 
        id: scheduleId,
        agencyId: user.agencyId,
      },
    })

    if (!existingSchedule) {
      return NextResponse.json({ 
        error: 'Schedule not found' 
      }, { status: 404 })
    }

    await prisma.reportSchedule.delete({
      where: { id: scheduleId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting report schedule:', error)
    return NextResponse.json({ 
      error: 'Failed to delete report schedule' 
    }, { status: 500 })
  }
}

function calculateNextRun(cronPattern: string): Date {
  // Simple next run calculation - in production you'd use a proper cron library
  const now = new Date()
  const nextRun = new Date(now)
  
  // For demo purposes, just add 1 day
  nextRun.setDate(now.getDate() + 1)
  
  return nextRun
}