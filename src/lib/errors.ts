/**
 * Standardized error handling utilities for Rylie SEO Hub
 * Provides consistent error handling patterns across the application
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/observability'

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  success: false
  error: string
  code?: string
  details?: any
  timestamp: string
}

/**
 * Standard success response structure
 */
export interface SuccessResponse<T = any> {
  success: true
  data: T
  timestamp: string
}

/**
 * API Response type
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

/**
 * Custom error classes for different types of errors
 */
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND_ERROR', 404)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429)
    this.name = 'RateLimitError'
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, service: string) {
    super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502)
    this.name = 'ExternalServiceError'
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string | Error | AppError,
  code?: string,
  details?: any
): ErrorResponse {
  let message: string
  let errorCode: string

  if (error instanceof AppError) {
    message = error.message
    errorCode = error.code
  } else if (error instanceof Error) {
    message = error.message
    errorCode = code || 'INTERNAL_ERROR'
  } else {
    message = error
    errorCode = code || 'INTERNAL_ERROR'
  }

  return {
    success: false,
    error: message,
    code: errorCode,
    details,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Handle API errors and return appropriate NextResponse
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  let appError: AppError

  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof Error) {
    appError = new AppError(error.message, 'INTERNAL_ERROR', 500)
  } else {
    appError = new AppError('An unexpected error occurred', 'INTERNAL_ERROR', 500)
  }

  // Log the error
  logger.error(`API Error${context ? ` in ${context}` : ''}`, {
    error: appError.message,
    code: appError.code,
    statusCode: appError.statusCode,
    stack: appError.stack,
  })

  const errorResponse = createErrorResponse(appError)
  return NextResponse.json(errorResponse, { status: appError.statusCode })
}

/**
 * Async error wrapper for API routes
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error, context)
    }
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(data: Record<string, any>, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(
    field => data[field] === undefined || data[field] === null || data[field] === ''
  )

  if (missingFields.length > 0) {
    throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`, {
      missingFields,
    })
  }
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<{ data: T | undefined; error: Error | null }> {
  try {
    const data = await operation()
    return { data, error: null }
  } catch (error) {
    logger.error('Safe async operation failed', { error })
    return {
      data: fallback,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxRetries) {
        throw lastError
      }

      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))

      logger.warn(`Operation failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries,
        error: lastError.message,
      })
    }
  }

  throw lastError!
}

/**
 * Type guard for checking if error is operational
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}
