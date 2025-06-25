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

type RouteHandler<
  TParams extends AppRouteParams = AppRouteParams,
  TContext = AuthenticatedContext,
> = (
  request: NextRequest,
  context: TContext & { params?: TParams }
) => Promise<NextResponse> | NextResponse

type OptionalAuthRouteHandler<TParams extends AppRouteParams = AppRouteParams> = (
  request: NextRequest,
  context: { user: ResolvedUser | null; tenant: TenantContext | null; params?: TParams }
) => Promise<NextResponse> | NextResponse

/**
 * Wrapper for authenticated routes
 * Automatically handles user resolution and tenant context
 * Returns 401 if no user is found
 */
export function withAuth<TParams extends AppRouteParams = AppRouteParams>(
  handler: RouteHandler<TParams, AuthenticatedContext>
): (request: NextRequest, routeContext?: { params?: TParams }) => Promise<NextResponse> {
  return async (request: NextRequest, routeContext?: { params?: TParams }) => {
    const params = routeContext?.params
    try {
      if (process.env.AUTH_DISABLED === 'true') {
        const user: ResolvedUser = {
          id: process.env.DEFAULT_USER_ID || 'test-user-id',
          email: process.env.DEFAULT_USER_EMAIL || 'user@example.com',
          name: 'Test User',
          agencyId: process.env.DEFAULT_AGENCY_ID || 'default-agency',
          role: 'ADMIN',
          isSuperAdmin: true,
        }

        const tenant: TenantContext = {
          agencyId: user.agencyId || null,
          user: user,
          agency: {
            id: user.agencyId || 'default-agency',
            name: 'Default Agency',
            plan: 'enterprise'
          }
        }
        return await handler(request, { user, tenant, params })
      }

      const user = await getRequestUser() // Corrected: getRequestUser now takes no arguments

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

      const headers = new Headers(request.headers)
      headers.set('x-user-id', user.id)
      if (tenant.agencyId) { // Check if agencyId is not null
        headers.set('x-agency-id', tenant.agencyId)
      }
      
      return await handler(request, { user, tenant, params })
    } catch (error) {
      console.error('Auth wrapper error:', error)

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
): (request: NextRequest, routeContext?: { params?: TParams }) => Promise<NextResponse> {
  return async (request: NextRequest, routeContext?: { params?: TParams }) => {
    const params = routeContext?.params
    try {
      const user = await getRequestUser() // Corrected: getRequestUser now takes no arguments
      const tenant = user ? await getTenantContext(user) : null

      if (user && tenant) {
        const headers = new Headers(request.headers)
        headers.set('x-user-id', user.id)
        if (tenant.agencyId) {
          headers.set('x-agency-id', tenant.agencyId)
        }
      }

      return await handler(request, { user, tenant, params })
    } catch (error) {
      console.error('Optional auth wrapper error:', error)
      return await handler(request, { user: null, tenant: null, params })
    }
  }
}

/**
 * Wrapper for admin-only routes
 * Requires user to be authenticated and have admin role
 */
export function withAdminAuth<TParams extends AppRouteParams = AppRouteParams>(
  handler: RouteHandler<TParams, AuthenticatedContext>
): (request: NextRequest, routeContext?: { params?: TParams }) => Promise<NextResponse> {
  return withAuth<TParams>(async (request, context) => {
    if (process.env.AUTH_DISABLED === 'true') {
      return handler(request, context)
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

    return handler(request, context)
  })
}

/**
 * Wrapper for super admin only routes
 * Requires user to be a super admin
 */
export function withSuperAdminAuth<TParams extends AppRouteParams = AppRouteParams>(
  handler: RouteHandler<TParams, AuthenticatedContext>
): (request: NextRequest, routeContext?: { params?: TParams }) => Promise<NextResponse> {
  return withAuth<TParams>(async (request, context) => {
    if (process.env.AUTH_DISABLED === 'true') {
      return handler(request, context)
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

    return handler(request, context)
  })
}

/**
 * Helper to extract and validate route params
 */
export function getRouteParams<T extends AppRouteParams>(
  routeContext: { params: T } | undefined | T
): T {
  if (!routeContext) {
    return {} as T
  }
  const resolvedParams = 'params' in routeContext ? routeContext.params : routeContext
  return resolvedParams as T
}

interface ErrorResponsePayload {
  error: string
  message: string
  details?: unknown
}

interface SuccessResponsePayload<TData> {
  success: boolean
  data: TData
  message?: string
}

/**
 * Standard error response helper
 */
export function errorResponse(
  message: string,
  status?: number,
  details?: unknown
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
}

/**
 * Standard success response helper
 */
export function successResponse<TData>(
  data: TData,
  message?: string,
  status?: number
): NextResponse<SuccessResponsePayload<TData>> {
  const effectiveStatus = status || 200
  const payload: SuccessResponsePayload<TData> = {
    success: true,
    data,
  }

  if (message) {
    payload.message = message
  }

  return NextResponse.json(payload, { status: effectiveStatus })
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
