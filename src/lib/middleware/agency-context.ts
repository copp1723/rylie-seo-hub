import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/observability'
import { logAuditEvent } from '@/lib/services/audit-service'
import { createTenantFilteredPrisma } from '@/lib/db/tenant-filter'

export interface AgencyContext {
  user: {
    id: string
    email: string
    name: string | null
    role: string
    isSuperAdmin: boolean
  }
  agency: {
    id: string
    name: string
    slug: string
    plan: string
    status: string
    maxUsers: number
    maxConversations: number
  }
  db: ReturnType<typeof createTenantFilteredPrisma>
}

interface AgencyContextError {
  error: string
  status: number
}

/**
 * List of paths that don't require agency context
 */
const PUBLIC_PATHS = [
  '/api/auth',
  '/api/health',
  '/_next',
  '/static',
  '/favicon.ico'
]

/**
 * List of paths that require super admin access
 */
const SUPER_ADMIN_PATHS = [
  '/api/admin/agencies',
  '/api/admin/users',
  '/api/admin/metrics'
]

/**
 * Extract and validate agency context from the request
 * This is the core of our multi-tenant security
 */
export async function getAgencyContext(
  request: NextRequest
): Promise<AgencyContext | AgencyContextError> {
  const startTime = Date.now()
  const path = request.nextUrl.pathname

  try {
    // Check if this is a public path
    if (PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath))) {
      return {
        error: 'Public endpoint - no agency context required',
        status: 200
      }
    }

    // Get the authenticated session
    const session = await auth()
    
    if (!session?.user?.email) {
      logger.warn('No authenticated session found', { path })
      return {
        error: 'Authentication required',
        status: 401
      }
    }

    // Fetch user with agency information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            status: true,
            maxUsers: true,
            maxConversations: true
          }
        }
      }
    })

    if (!user) {
      logger.error('User not found in database', { 
        email: session.user.email,
        path 
      })
      return {
        error: 'User not found',
        status: 404
      }
    }

    // Check if user needs super admin access
    if (SUPER_ADMIN_PATHS.some(adminPath => path.startsWith(adminPath))) {
      if (!user.isSuperAdmin) {
        await logAuditEvent({
          action: 'UNAUTHORIZED_ADMIN_ACCESS',
          resourceType: 'admin',
          resourceId: path,
          userId: user.id,
          agencyId: user.agencyId || 'none',
          userEmail: user.email,
          metadata: {
            path,
            userRole: user.role,
            isSuperAdmin: user.isSuperAdmin
          }
        })
        
        logger.warn('Non-super admin attempted to access admin endpoint', {
          userId: user.id,
          email: user.email,
          path
        })
        
        return {
          error: 'Super admin access required',
          status: 403
        }
      }
    }

    // For non-super admin users, agency is required
    if (!user.isSuperAdmin && !user.agency) {
      logger.warn('User has no agency assigned', {
        userId: user.id,
        email: user.email,
        path
      })
      return {
        error: 'No agency assigned to user',
        status: 403
      }
    }

    // For super admins accessing non-admin endpoints, they might need to specify an agency
    if (user.isSuperAdmin && !user.agency && !SUPER_ADMIN_PATHS.some(adminPath => path.startsWith(adminPath))) {
      // Check if agency is specified in the request
      const agencyIdHeader = request.headers.get('x-agency-id')
      const agencyIdQuery = request.nextUrl.searchParams.get('agencyId')
      const specifiedAgencyId = agencyIdHeader || agencyIdQuery

      if (specifiedAgencyId) {
        // Validate the specified agency exists
        const agency = await prisma.agency.findUnique({
          where: { id: specifiedAgencyId }
        })

        if (!agency) {
          return {
            error: 'Specified agency not found',
            status: 404
          }
        }

        // Create context with specified agency
        const db = createTenantFilteredPrisma({
          agencyId: agency.id,
          userId: user.id
        })

        logger.info('Super admin accessing with specified agency', {
          userId: user.id,
          agencyId: agency.id,
          path,
          duration: Date.now() - startTime
        })

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: 'admin', // Super admins have admin role in any agency
            isSuperAdmin: true
          },
          agency: {
            id: agency.id,
            name: agency.name,
            slug: agency.slug,
            plan: agency.plan,
            status: agency.status,
            maxUsers: agency.maxUsers,
            maxConversations: agency.maxConversations
          },
          db
        }
      } else {
        return {
          error: 'Super admin must specify an agency for this endpoint',
          status: 400
        }
      }
    }

    const agency = user.agency!

    // Check if agency is active
    if (agency.status !== 'active') {
      await logAuditEvent({
        action: 'INACTIVE_AGENCY_ACCESS',
        resourceType: 'agency',
        resourceId: agency.id,
        userId: user.id,
        agencyId: agency.id,
        userEmail: user.email,
        metadata: {
          agencyStatus: agency.status,
          path
        }
      })

      logger.warn('Attempt to access inactive agency', {
        userId: user.id,
        agencyId: agency.id,
        agencyStatus: agency.status,
        path
      })

      return {
        error: 'Agency is not active',
        status: 403
      }
    }

    // Create tenant-filtered database client
    const db = createTenantFilteredPrisma({
      agencyId: agency.id,
      userId: user.id
    })

    logger.info('Agency context established', {
      userId: user.id,
      agencyId: agency.id,
      userRole: user.role,
      path,
      duration: Date.now() - startTime
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin
      },
      agency,
      db
    }
  } catch (error) {
    logger.error('Error establishing agency context', {
      error,
      path,
      duration: Date.now() - startTime
    })
    
    return {
      error: 'Internal server error',
      status: 500
    }
  }
}

/**
 * Middleware wrapper that enforces agency context
 * Use this to wrap all API route handlers
 */
export function withAgencyContext<T = any>(
  handler: (
    request: NextRequest,
    context: AgencyContext,
    params?: T
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, params?: T) => {
    const contextResult = await getAgencyContext(request)

    // Check if we got an error
    if ('error' in contextResult) {
      // For public paths, continue without context
      if (contextResult.status === 200) {
        return handler(request, null as any, params)
      }

      return NextResponse.json(
        { error: contextResult.error },
        { status: contextResult.status }
      )
    }

    // Log the API access
    await logAuditEvent({
      action: `API_${request.method}`,
      resourceType: 'api',
      resourceId: request.nextUrl.pathname,
      userId: contextResult.user.id,
      agencyId: contextResult.agency.id,
      userEmail: contextResult.user.email,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        method: request.method,
        path: request.nextUrl.pathname,
        query: Object.fromEntries(request.nextUrl.searchParams)
      }
    })

    // Call the handler with the agency context
    try {
      return await handler(request, contextResult, params)
    } catch (error) {
      logger.error('Handler error with agency context', {
        error,
        userId: contextResult.user.id,
        agencyId: contextResult.agency.id,
        path: request.nextUrl.pathname
      })

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Check if user has required role within their agency
 */
export function requireRole(
  context: AgencyContext,
  requiredRole: 'viewer' | 'user' | 'admin'
): boolean {
  // Super admins always have access
  if (context.user.isSuperAdmin) {
    return true
  }

  const roleHierarchy = {
    viewer: 0,
    user: 1,
    admin: 2
  }

  const userRoleLevel = roleHierarchy[context.user.role as keyof typeof roleHierarchy] || 0
  const requiredRoleLevel = roleHierarchy[requiredRole]

  return userRoleLevel >= requiredRoleLevel
}

/**
 * Check if agency has capacity for more resources
 */
export async function checkAgencyLimits(
  context: AgencyContext,
  resourceType: 'users' | 'conversations'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  try {
    let current = 0
    let limit = 0

    switch (resourceType) {
      case 'users':
        current = await context.db.user.count()
        limit = context.agency.maxUsers
        break

      case 'conversations':
        current = await context.db.conversation.count()
        limit = context.agency.maxConversations
        break
    }

    const allowed = current < limit

    if (!allowed) {
      logger.warn('Agency limit exceeded', {
        agencyId: context.agency.id,
        resourceType,
        current,
        limit,
        plan: context.agency.plan
      })

      await logAuditEvent({
        action: 'AGENCY_LIMIT_EXCEEDED',
        resourceType: 'agency',
        resourceId: context.agency.id,
        userId: context.user.id,
        agencyId: context.agency.id,
        userEmail: context.user.email,
        metadata: {
          resourceType,
          current,
          limit,
          plan: context.agency.plan
        }
      })
    }

    return { allowed, current, limit }
  } catch (error) {
    logger.error('Error checking agency limits', {
      error,
      agencyId: context.agency.id,
      resourceType
    })
    
    return { allowed: false, current: 0, limit: 0 }
  }
}