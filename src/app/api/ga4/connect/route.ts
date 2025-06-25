import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { connectGA4Property } from '@/lib/ga4'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { propertyId, propertyName } = await request.json()

    if (!propertyId || !propertyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user's agency
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true },
    })

    if (!user?.agencyId) {
      return NextResponse.json({ error: 'No agency found' }, { status: 400 })
    }

    // Get refresh token
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
      select: {
        refresh_token: true,
      },
    })

    // Connect GA4 property to agency
    await connectGA4Property(
      user.agencyId,
      propertyId,
      propertyName,
      account?.refresh_token || undefined
    )

    return NextResponse.json({
      success: true,
      message: 'GA4 property connected successfully',
    })
  } catch (error) {
    console.error('GA4 connect error:', error)
    return NextResponse.json({ error: 'Failed to connect GA4 property' }, { status: 500 })
  }
}
