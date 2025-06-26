// src/app/api/reports/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, AuditAction } from '@/lib/audit'

const scheduleCreateSchema = z.object({
  agencyId: z.string(),
  cronPattern: z.string(), // Basic validation, more can be added
  ga4PropertyId: z.string(),
  reportType: z.enum(['WeeklySummary', 'MonthlyReport', 'QuarterlyBusinessReview']),
  emailRecipients: z.array(z.string().email()).min(1),
  brandingOptionsJson: z.string().optional(),
  isActive: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const user = session.user
    const body = await req.json()

    const parseResult = scheduleCreateSchema.safeParse({ ...body, agencyId: user.agencyId })
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: parseResult.error.flatten() }, { status: 400 })
    }

    const {
      agencyId,
      cronPattern,
      ga4PropertyId,
      reportType,
      emailRecipients,
      brandingOptionsJson,
      isActive,
    } = parseResult.data

    const newSchedule = await prisma.reportSchedule.create({
      data: {
        agencyId,
        cronPattern,
        ga4PropertyId,
        reportType,
        emailRecipients,
        brandingOptionsJson,
        isActive,
        userId: user.id, // Link to the user who created it
      },
    })

    await createAuditLog({
      userId: user.id,
      userEmail: user.email || 'unknown',
      action: 'REPORT_SCHEDULE_CREATED' as AuditAction,
      entityId: newSchedule.id,
      entityType: 'ReportSchedule',
      details: { schedule: newSchedule },
    })

    return NextResponse.json(newSchedule, { status: 201 })
  } catch (error) {
    console.error('Error creating report schedule:', error)
    return NextResponse.json({ error: 'Failed to create report schedule' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const user = session.user

    const schedules = await prisma.reportSchedule.findMany({
      where: {
        agencyId: user.agencyId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(schedules)
  } catch (error) {
    console.error('Error fetching report schedules:', error)
    return NextResponse.json({ error: 'Failed to fetch report schedules' }, { status: 500 })
  }
}
