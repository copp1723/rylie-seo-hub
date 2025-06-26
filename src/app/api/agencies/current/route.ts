import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Handle auth disabled mode
    if (process.env.AUTH_DISABLED === 'true') {
      const mockAgency = {
        id: process.env.DEFAULT_AGENCY_ID || 'default-agency',
        name: 'Default Agency',
        ga4PropertyId: null,
        ga4PropertyName: null,
        updatedAt: new Date().toISOString(),
      }
      return NextResponse.json(mockAgency)
    }

    const session = await requireAuth()

    // Get user with agency
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            ga4PropertyId: true,
            ga4PropertyName: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!user?.agency) {
      return NextResponse.json({ 
        error: 'User not associated with an agency' 
      }, { status: 404 })
    }

    return NextResponse.json(user.agency)
  } catch (error) {
    console.error('Error fetching current agency:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch agency information' 
    }, { status: 500 })
  }
}