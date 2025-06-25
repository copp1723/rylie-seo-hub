import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser, getTenantContext, ResolvedUser, TenantContext } from '@/lib/auth/user-resolver'

export interface AuthenticatedContext {
  user: ResolvedUser
  tenant: TenantContext
}

type RouteHandler<T = unknown> = ( // Changed default from any to unknown
  request: NextRequest,
  context: AuthenticatedContext,
  params?: T
) => Promise<NextResponse> | NextResponse

type OptionalAuthRouteHandler<T = unknown> = ( // Changed default from any to unknown
  request: NextRequest,
  context: { user: ResolvedUser | null; tenant: TenantContext | null },
  params?: T
) => Promise<NextResponse> | NextResponse

/**
 * Wrapper for authenticated routes
 * Automatically handles user resolution and tenant context
 * Returns 401 if no user is found
 */
export function withAuth<T = any>(handler: RouteHandler<T>) {
  return async (request: NextRequest, params?: T) => {
    try {
      // PATCH: Check if auth is disabled first
      if (process.env.AUTH_DISABLED === 'true') {
        // Use default user and tenant
        const user: ResolvedUser = {
          id: process.env.DEFAULT_USER_ID || 'test-user-id',
          email: process.env.DEFAULT_USER_EMAIL || 'user@example.com',
          name: 'Test User',
          agencyId: process.env.DEFAULT_AGENCY_ID || 'default-agency',
          role: 'ADMIN',
          isSuperAdmin: true
        }
        
        const tenant: TenantContext = {
          // userId: user.id, // TenantContext placeholder doesn't have userId
          agencyId: user.agencyId || null, // Ensure it's string | null
          agencyName: 'Default Agency',
          agencySlug: 'default',
          agencyPlan: 'enterprise',
          plan: 'enterprise',
          limits: {
            conversations: -1,
            orders: -1,
            users: -1
          }
        }
        
        return await handler(request, { user, tenant }, params)
      }
      
      // Original auth logic
      const user = await getRequestUser() // Removed request argument
      
      if (!user) {
        return NextResponse.json(
          { 
            error: 'Unauthorized',
            message: 'You must be logged in to access this resource'
          },
          { status: 401 }
        )
      }
      
      const tenant = await getTenantContext(user)
      
      // Add user and tenant to request headers for logging/tracking
      const headers = new Headers(request.headers)
      headers.set('x-user-id', user.id)
      if (tenant.agencyId) {
        headers.set('x-agency-id', tenant.agencyId)
      }
      
      return await handler(request, { user, tenant }, params)
    } catch (error) {
      console.error('Auth wrapper error:', error)
      
      // Check if it's an agency not found error
      if (error instanceof Error && error.message.includes('Agency not found')) {
        return NextResponse.json(
          { 
            error: 'Configuration Error',
            message: 'User agency configuration is invalid. Please contact support.'
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Wrapper for routes that work with or without authentication
 * User and tenant will be null if not authenticated
 */
export function withOptionalAuth<T = any>(handler: OptionalAuthRouteHandler<T>) {
  return async (request: NextRequest, params?: T) => {
    try {
      const user = await getRequestUser() // Removed request argument
      const tenant = user ? await getTenantContext(user) : null
      
      // Add user info to headers if available
      if (user && tenant) {
        const headers = new Headers(request.headers)
        headers.set('x-user-id', user.id)
        if (tenant.agencyId) {
          headers.set('x-agency-id', tenant.agencyId)
        }
      }
      
      return await handler(request, { user, tenant }, params)
    } catch (error) {
      console.error('Optional auth wrapper error:', error)
      
      // For optional auth, we still want to call the handler even if there's an error
      // Just pass null user and tenant
      return await handler(request, { user: null, tenant: null }, params)
    }
  }
}

/**
 * Wrapper for admin-only routes
 * Requires user to be authenticated and have admin role
 */
export function withAdminAuth<T = any>(handler: RouteHandler<T>) {
  return withAuth<T>(async (request, context, params) => {
    // PATCH: If auth is disabled, allow all admin routes
    if (process.env.AUTH_DISABLED === 'true') {
      return handler(request, context, params)
    }
    
    if (context.user.role !== 'ADMIN' && !context.user.isSuperAdmin) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'You do not have permission to access this resource'
        },
        { status: 403 }
      )
    }
    
    return handler(request, context, params)
  })
}

/**
 * Wrapper for super admin only routes
 * Requires user to be a super admin
 */
export function withSuperAdminAuth<T = any>(handler: RouteHandler<T>) {
  return withAuth<T>(async (request, context, params) => {
    // PATCH: If auth is disabled, allow all super admin routes
    if (process.env.AUTH_DISABLED === 'true') {
      return handler(request, context, params)
    }
    
    if (!context.user.isSuperAdmin) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'Super admin access required'
        },
        { status: 403 }
      )
    }
    
    return handler(request, context, params)
  })
}

/**
 * Helper to extract and validate route params
 */
export function getRouteParams<T extends Record<string, string>>(
  params: { params?: T } | T | undefined | null // More specific type for params
): T {
  // Handle both Next.js 13 and 14 param formats
  const resolvedParams = (params as { params?: T })?.params || params;
  return resolvedParams as T;
}

/**
 * Standard error response helper
 */
export function errorResponse(
  message: string,
  status: number = 500,
  details?: unknown // Changed from any to unknown
): NextResponse {
  const responseBody: { error: string; message: string; details?: unknown } = { // Typed responseBody
    error: getErrorType(status),
    message
  }
  
  if (details !== undefined) { // Check for undefined explicitly for optional params
    responseBody.details = details
  }
  
  return NextResponse.json(responseBody, { status })
}

/**
 * Standard success response helper
 */
export function successResponse<T = unknown>( // Changed default T from any to unknown
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const responseBody: { success: boolean; data: T; message?: string } = { // Typed responseBody
    success: true,
    data
  }
  
  if (message) {
    responseBody.message = message
  }
  
  return NextResponse.json(responseBody, { status })
}

/**
 * Get error type from status code
 */
function getErrorType(status: number): string {
  const errorTypes: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  }
  
  return errorTypes[status] || 'Error'
}
