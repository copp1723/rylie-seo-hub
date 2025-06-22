import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GA4Service } from '@/lib/ga4'
import { getValidGoogleAccessToken } from '@/lib/google-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get a valid access token (will refresh if needed)
    const accessToken = await getValidGoogleAccessToken(session.user.id)
    
    // List GA4 properties
    const ga4 = new GA4Service(accessToken)
    const properties = await ga4.listProperties()
    
    return NextResponse.json({
      success: true,
      properties: properties.map((prop: any) => ({
        id: prop.name.split('/').pop(),
        name: prop.displayName,
        fullName: prop.name,
      })),
    })
  } catch (error: any) {
    console.error('GA4 properties error:', error)
    
    // Return more specific error messages
    if (error.message?.includes('No Google account connected')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    } else if (error.message?.includes('Authentication failed') || error.message?.includes('Token expired')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    } else if (error.message?.includes('Access denied') || error.message?.includes('Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch GA4 properties' },
      { status: 500 }
    )
  }
}