import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GA4Service } from '@/lib/ga4'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's access token from account
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
      select: {
        access_token: true,
        refresh_token: true,
      },
    })
    
    if (!account?.access_token) {
      return NextResponse.json({ error: 'No Google account connected' }, { status: 400 })
    }
    
    // List GA4 properties
    const ga4 = new GA4Service(account.access_token)
    const properties = await ga4.listProperties()
    
    return NextResponse.json({
      success: true,
      properties: properties.map((prop: any) => ({
        id: prop.name.split('/').pop(),
        name: prop.displayName,
        fullName: prop.name,
      })),
    })
  } catch (error) {
    console.error('GA4 properties error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GA4 properties' },
      { status: 500 }
    )
  }
}