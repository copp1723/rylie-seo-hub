import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
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

    // Remove GA4 property from agency and delete user tokens
    await Promise.all([
      prisma.agency.update({
        where: { id: user.agencyId },
        data: {
          ga4PropertyId: null,
          ga4PropertyName: null,
        },
      }),
      prisma.userGA4Token.deleteMany({
        where: { userId: session.user.id },
      }),
      // Also deactivate any report schedules
      prisma.reportSchedule.updateMany({
        where: { 
          agencyId: user.agencyId,
          userId: session.user.id,
        },
        data: { isActive: false },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting GA4:', error)
    return NextResponse.json({ 
      error: 'Failed to disconnect GA4 account' 
    }, { status: 500 })
  }
}