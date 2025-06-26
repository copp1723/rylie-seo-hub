import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { propertyId, propertyName } = await request.json()

    if (!propertyId || !propertyName) {
      return NextResponse.json({ 
        error: 'Property ID and name are required' 
      }, { status: 400 })
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

    // Update agency with GA4 property
    const updatedAgency = await prisma.agency.update({
      where: { id: user.agencyId },
      data: {
        ga4PropertyId: propertyId,
        ga4PropertyName: propertyName,
      },
    })

    return NextResponse.json({ 
      success: true,
      agency: {
        id: updatedAgency.id,
        ga4PropertyId: updatedAgency.ga4PropertyId,
        ga4PropertyName: updatedAgency.ga4PropertyName,
      }
    })
  } catch (error) {
    console.error('Error connecting GA4 property:', error)
    return NextResponse.json({ 
      error: 'Failed to connect GA4 property' 
    }, { status: 500 })
  }
}