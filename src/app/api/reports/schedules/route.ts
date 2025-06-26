import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import cronParser from 'cron-parser'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

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

    const schedules = await prisma.reportSchedule.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('Error fetching report schedules:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch report schedules' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { reportType, cronPattern, emailRecipients, isActive, brandingOptionsJson } = body

    // Validation
    if (!reportType || !cronPattern || !emailRecipients || !Array.isArray(emailRecipients) || emailRecipients.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid required fields (reportType, cronPattern, emailRecipients)' }, { status: 400 })
    }

    try {
      cronParser.parseExpression(cronPattern)
    } catch (err) {
      return NextResponse.json({ error: 'Invalid cronPattern format' }, { status: 400 })
    }

    // Get user's agency and GA4 property
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        agency: {
          select: {
            id: true,
            ga4PropertyId: true,
          },
        },
      },
    })

    if (!user?.agency) {
      return NextResponse.json({ error: 'User not associated with an agency' }, { status: 400 })
    }

    if (!user.agency.ga4PropertyId) {
      return NextResponse.json({ error: 'No GA4 property connected. Please connect a GA4 property first.' }, { status: 400 })
    }

    const nextRun = cronParser.parseExpression(cronPattern).next().toDate()

    const schedule = await prisma.reportSchedule.create({
      data: {
        agencyId: user.agency.id,
        userId: session.user.id,
        reportType,
        cronPattern,
        emailRecipients,
        ga4PropertyId: user.agency.ga4PropertyId,
        isActive: isActive ?? true,
        brandingOptionsJson: brandingOptionsJson || null,
        nextRun,
        status: 'active', // Initialize status
      },
    })

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_REPORT_SCHEDULE',
        entityType: 'ReportSchedule',
        entityId: schedule.id,
        userId: session.user.id,
        userEmail: session.user.email || '',
        details: { ...body, scheduleId: schedule.id },
      },
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error: any) {
    console.error('Error creating report schedule:', error)
    // Check for Prisma unique constraint violation if necessary, though not typical for create
    if (error.code === 'P2002') { // Example: Unique constraint failed
        return NextResponse.json({ error: 'Failed to create report schedule due to a conflict.' }, { status: 409 });
    }
    return NextResponse.json({ error: `Failed to create report schedule: ${error.message || 'Unknown error'}` }, { status: 500 })
  }
}
// Removed old calculateNextRun function