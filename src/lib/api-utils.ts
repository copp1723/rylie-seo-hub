/**
 * API response utilities for consistent API responses
 * Standardizes response format across all API endpoints
 */

import { NextResponse } from 'next/server'
import { createSuccessResponse, createErrorResponse } from '@/lib/errors'

/**
 * Create a successful API response
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  const response = createSuccessResponse(data)
  return NextResponse.json(response, { status })
}

/**
 * Create an error API response
 */
export function apiError(
  message: string,
  status: number = 500,
  code?: string,
  details?: Record<string, unknown>
): NextResponse {
  const response = createErrorResponse(message, code, details)
  return NextResponse.json(response, { status })
}

/**
 * Create a validation error response
 */
export function apiValidationError(
  message: string,
  details?: Record<string, unknown>
): NextResponse {
  return apiError(message, 400, 'VALIDATION_ERROR', details)
}

/**
 * Create an authentication error response
 */
export function apiAuthError(message: string = 'Authentication required'): NextResponse {
  return apiError(message, 401, 'AUTHENTICATION_ERROR')
}

/**
 * Create an authorization error response
 */
export function apiAuthzError(message: string = 'Insufficient permissions'): NextResponse {
  return apiError(message, 403, 'AUTHORIZATION_ERROR')
}

/**
 * Create a not found error response
 */
export function apiNotFound(message: string = 'Resource not found'): NextResponse {
  return apiError(message, 404, 'NOT_FOUND_ERROR')
}

/**
 * Create a rate limit error response
 */
export function apiRateLimit(message: string = 'Rate limit exceeded'): NextResponse {
  return apiError(message, 429, 'RATE_LIMIT_ERROR')
}

/**
 * Create a server error response
 */
export function apiServerError(message: string = 'Internal server error'): NextResponse {
  return apiError(message, 500, 'INTERNAL_ERROR')
}

/**
 * Parse and validate JSON request body
 */
export async function parseRequestBody<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const body = await request.json()
    return body as T
  } catch {
    throw new Error('Invalid JSON in request body')
  }
}

/**
 * Extract query parameters from URL
 */
export function getQueryParams(url: string): Record<string, string> {
  const urlObj = new URL(url)
  const params: Record<string, string> = {}

  urlObj.searchParams.forEach((value, key) => {
    params[key] = value
  })

  return params
}

/**
 * Validate request method
 */
export function validateMethod(request: Request, allowedMethods: string[]): void {
  if (!allowedMethods.includes(request.method)) {
    throw new Error(`Method ${request.method} not allowed`)
  }
}

/**
 * CORS headers for API responses
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

/**
 * Add CORS headers to response
 */
export function withCors(response: NextResponse): NextResponse {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

/**
 * Handle OPTIONS request for CORS
 */
export function handleOptions(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

/**
 * Pagination utilities
 */
export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit: number = 20,
  maxLimit: number = 100
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit), 10))
  )
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit)

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  }
}
