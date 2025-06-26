import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { reportType, cronPattern, emailRecipients, isActive, brandingOptionsJson } = await request.json()

    // Validation
    if (!reportType || !cronPattern || !emailRecipients || emailRecipients.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
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
      return NextResponse.json({ 
        error: 'User not associated with an agency' 
      }, { status: 400 })
    }

    if (!user.agency.ga4PropertyId) {
      return NextResponse.json({ 
        error: 'No GA4 property connected. Please connect a GA4 property first.' 
      }, { status: 400 })
    }

    // Calculate next run time based on cron pattern
    const nextRun = calculateNextRun(cronPattern)

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
      },
    })

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error('Error creating report schedule:', error)
    return NextResponse.json({ 
      error: 'Failed to create report schedule' 
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