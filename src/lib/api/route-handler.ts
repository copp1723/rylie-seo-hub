import { NextRequest, NextResponse } from 'next/server'
import {
  getRequestUser,
  getTenantContext,
  ResolvedUser,
  TenantContext,
} from '@/lib/auth/user-resolver'

// Define a more specific type for route parameters if possible, or use a base type
export type AppRouteParams = Record<string, string | string[] | undefined>

export interface AuthenticatedContext {
  user: ResolvedUser
  tenant: TenantContext
}

 fix/typescript-errors
type RouteHandler<T = unknown> = ( // Changed default from any to unknown
=======
type RouteHandler<
  TParams extends AppRouteParams = AppRouteParams,
  TContext = AuthenticatedContext,
> = (
main
  request: NextRequest,
  context: TContext,
  params?: TParams // params typically come from the dynamic route segments like { params: { id: '123' } }
) => Promise<NextResponse> | NextResponse

 fix/typescript-errors
type OptionalAuthRouteHandler<T = unknown> = ( // Changed default from any to unknown
=======
type OptionalAuthRouteHandler<TParams extends AppRouteParams = AppRouteParams> = (
 main
  request: NextRequest,
  context: { user: ResolvedUser | null; tenant: TenantContext | null },
  params?: TParams
) => Promise<NextResponse> | NextResponse

/**
 * Wrapper for authenticated routes
 * Automatically handles user resolution and tenant context
 * Returns 401 if no user is found
 */
export function withAuth<TParams extends AppRouteParams = AppRouteParams>(
  handler: RouteHandler<TParams, AuthenticatedContext>
): (request: NextRequest, routeContext: { params: TParams }) => Promise<NextResponse> {
  // Adjusted routeContext
  return async (request: NextRequest, routeContext: { params: TParams }) => {
    // Adjusted routeContext
    const params = routeContext?.params // Extract params
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
          isSuperAdmin: true,
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
            users: -1,
          },
        }

        return await handler(request, { user, tenant }, params)
      }

      // Original auth logic
 fix/typescript-errors
      const user = await getRequestUser() // Removed request argument
      
=======
      const user = await getRequestUser(request)

 main
      if (!user) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'You must be logged in to access this resource',
          },
          { status: 401 }
        )
      }

      const tenant = await getTenantContext(user)

      // Add user and tenant to request headers for logging/tracking
      const headers = new Headers(request.headers)
      headers.set('x-user-id', user.id)
 fix/typescript-errors
      if (tenant.agencyId) {
        headers.set('x-agency-id', tenant.agencyId)
      }
      
=======
      headers.set('x-agency-id', tenant.agencyId)

 main
      return await handler(request, { user, tenant }, params)
    } catch (error) {
      console.error('Auth wrapper error:', error)

      // Check if it's an agency not found error
      if (error instanceof Error && error.message.includes('Agency not found')) {
        return NextResponse.json(
          {
            error: 'Configuration Error',
            message: 'User agency configuration is invalid. Please contact support.',
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
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
export function withOptionalAuth<TParams extends AppRouteParams = AppRouteParams>(
  handler: OptionalAuthRouteHandler<TParams>
): (request: NextRequest, routeContext: { params: TParams }) => Promise<NextResponse> {
  return async (request: NextRequest, routeContext: { params: TParams }) => {
    const params = routeContext?.params // Extract params
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
export function withAdminAuth<TParams extends AppRouteParams = AppRouteParams>(
  handler: RouteHandler<TParams, AuthenticatedContext>
): (request: NextRequest, routeContext: { params: TParams }) => Promise<NextResponse> {
  return withAuth<TParams>(async (request, context, params) => {
    // PATCH: If auth is disabled, allow all admin routes
    if (process.env.AUTH_DISABLED === 'true') {
      return handler(request, context, params)
    }

    if (context.user.role !== 'ADMIN' && !context.user.isSuperAdmin) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
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
export function withSuperAdminAuth<TParams extends AppRouteParams = AppRouteParams>(
  handler: RouteHandler<TParams, AuthenticatedContext>
): (request: NextRequest, routeContext: { params: TParams }) => Promise<NextResponse> {
  return withAuth<TParams>(async (request, context, params) => {
    // PATCH: If auth is disabled, allow all super admin routes
    if (process.env.AUTH_DISABLED === 'true') {
      return handler(request, context, params)
    }

    if (!context.user.isSuperAdmin) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Super admin access required',
        },
        { status: 403 }
      )
    }

    return handler(request, context, params)
  })
}

/**
 * Helper to extract and validate route params
 * The second argument `routeContext` in Next.js App Router handlers is typically { params: YourParamsType }
 */
 fix/typescript-errors
export function getRouteParams<T extends Record<string, string>>(
  params: { params?: T } | T | undefined | null // More specific type for params
): T {
  // Handle both Next.js 13 and 14 param formats
  const resolvedParams = (params as { params?: T })?.params || params;
  return resolvedParams as T;
=======
export function getRouteParams<T extends AppRouteParams>(
  routeContext: { params: T } | undefined | T // Allow passing params directly or the whole context object
): T {
  if (!routeContext) {
    return {} as T // Or throw error, depending on expected usage
  }
  // Handle both Next.js 13/14 { params: ... } structure and direct params object
  const resolvedParams = 'params' in routeContext ? routeContext.params : routeContext
  return resolvedParams as T
 main
}

interface ErrorResponsePayload {
  error: string
  message: string
  details?: unknown // Changed from any to unknown
}

interface SuccessResponsePayload<T> {
  success: boolean
  data: T
  message?: string
}

/**
 * Standard error response helper
 */
export function errorResponse(
  message: string,
 fix/typescript-errors
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
=======
  status?: number, // Made status optional to match common usage, defaults below
  details?: unknown // Changed from any to unknown
): NextResponse<ErrorResponsePayload> {
  const effectiveStatus = status || 500
  const payload: ErrorResponsePayload = {
    error: getErrorType(effectiveStatus),
    message,
  }

  if (details !== undefined) {
    payload.details = details
  }

  return NextResponse.json(payload, { status: effectiveStatus })
 main
}

/**
 * Standard success response helper
 */
 fix/typescript-errors
export function successResponse<T = unknown>( // Changed default T from any to unknown
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const responseBody: { success: boolean; data: T; message?: string } = { // Typed responseBody
=======
export function successResponse<TData>( // Changed generic name from T to TData for clarity
  data: TData,
  message?: string,
  status?: number // Made status optional
): NextResponse<SuccessResponsePayload<TData>> {
  const effectiveStatus = status || 200
  const payload: SuccessResponsePayload<TData> = {
 main
    success: true,
    data,
  }

  if (message) {
 fix/typescript-errors
    responseBody.message = message
  }
  
  return NextResponse.json(responseBody, { status })
=======
    payload.message = message
  }

  return NextResponse.json(payload, { status: effectiveStatus })
 main
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
    503: 'Service Unavailable',
  }

  return errorTypes[status] || 'Error'
}
