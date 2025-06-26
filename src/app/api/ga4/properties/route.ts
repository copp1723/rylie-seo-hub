import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { GA4Service, getGA4Tokens } from '@/lib/ga4'
import { logGA4AuthEvent, AuditAction } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await requireAuth()
    const userId = session.user.id
    const userEmail = session.user.email || 'unknown'

    // Check if user has GA4 tokens
    const tokens = await getGA4Tokens(userId)
    if (!tokens) {
      await logGA4AuthEvent(
        AuditAction.GA4_PROPERTY_LIST_FAILED,
        userId,
        userEmail,
        { error: 'No GA4 tokens found' }
      )
      
      return NextResponse.json({ 
        error: 'No GA4 access token found. Please connect your GA4 account first.',
        code: 'NO_GA4_TOKEN'
      }, { status: 401 })
    }

    // Create GA4 service instance with user's tokens
    const ga4Service = await GA4Service.createForUser(userId)
    
    // Fetch properties from Google Analytics Admin API
    const properties = await ga4Service.listProperties()

    // Log successful property fetch
    await logGA4AuthEvent(
      AuditAction.GA4_PROPERTY_LIST,
      userId,
      userEmail,
      { 
        propertyCount: properties.length,
        properties: properties.map(p => ({ 
          propertyId: p.propertyId, 
          propertyName: p.propertyName 
        }))
      }
    )

    return NextResponse.json({ 
      properties,
      count: properties.length
    })
  } catch (error) {
    console.error('Error fetching GA4 properties:', error)
    
    // Try to get user info for logging
    let userId = 'unknown'
    let userEmail = 'unknown'
    try {
      const session = await requireAuth()
      userId = session.user.id
      userEmail = session.user.email || 'unknown'
    } catch {}

    // Log the error
    await logGA4AuthEvent(
      AuditAction.GA4_PROPERTY_LIST_FAILED,
      userId,
      userEmail,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
    
    if (error instanceof Error) {
      // Handle specific error cases
      if (error.message.includes('No GA4 tokens found for user')) {
        return NextResponse.json({ 
          error: 'Authentication required. Please connect your GA4 account.',
          code: 'AUTH_REQUIRED'
        }, { status: 401 })
      }
      
      if (error.message.includes('insufficient authentication scopes')) {
        return NextResponse.json({ 
          error: 'Insufficient permissions. Please reconnect your GA4 account with analytics permissions.',
          code: 'INSUFFICIENT_SCOPE'
        }, { status: 403 })
      }
      
      if (error.message.includes('Request had invalid authentication credentials')) {
        return NextResponse.json({ 
          error: 'Authentication expired. Please reconnect your GA4 account.',
          code: 'AUTH_EXPIRED'
        }, { status: 401 })
      }
      
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return NextResponse.json({ 
          error: 'API rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT'
        }, { status: 429 })
      }
    }

    // Generic error response
    return NextResponse.json({ 
      error: 'Failed to fetch GA4 properties. Please try again.',
      code: 'FETCH_FAILED'
    }, { status: 500 })
  }
}
