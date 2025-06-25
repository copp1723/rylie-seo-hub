import { NextRequest, NextResponse } from 'next/server'
import { withAgencyContext } from '@/lib/middleware/agency-context'
import { GA4Service } from '@/lib/ga4'
import { getValidGoogleAccessToken } from '@/lib/google-auth'
import { logger } from '@/lib/observability'

export const GET = withAgencyContext(async (request, context) => {
  try {
    // Get a valid access token (will refresh if needed)
    const accessToken = await getValidGoogleAccessToken(context.user.id)
    
    // List GA4 properties
    const ga4 = new GA4Service(accessToken)
    const properties = await ga4.listProperties()
    
    // Log the GA4 property access
    await context.db.auditLog.create({
      data: {
        action: 'GA4_PROPERTIES_LISTED',
        entityType: 'ga4',
        entityId: 'properties',
        userEmail: context.user.email,
        details: {
          propertiesCount: properties.length,
          userId: context.user.id
        }
      }
    })
    
    logger.info('GA4 properties listed', {
      userId: context.user.id,
      agencyId: context.agency.id,
      propertiesCount: properties.length
    })
    
    return NextResponse.json({
      success: true,
      properties: properties.map((prop: any) => ({
        id: prop.name.split('/').pop(),
        name: prop.displayName,
        fullName: prop.name,
      })),
    })
  } catch (error: any) {
    logger.error('GA4 properties error:', {
      error,
      userId: context.user.id,
      agencyId: context.agency.id
    })
    
    // Log failed attempt
    await context.db.auditLog.create({
      data: {
        action: 'GA4_PROPERTIES_LIST_FAILED',
        entityType: 'ga4',
        entityId: 'properties',
        userEmail: context.user.email,
        details: {
          error: error.message,
          userId: context.user.id
        }
      }
    }).catch(err => logger.error('Failed to log audit event', { err }))
    
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
})