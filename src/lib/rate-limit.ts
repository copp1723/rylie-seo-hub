import { NextRequest, NextResponse } from 'next/server'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore: RateLimitStore = {}

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string // Custom error message
}

export function createRateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Get client identifier (IP address or user ID)
    const clientId = getClientId(request)
    const now = Date.now()

    // Clean up expired entries
    cleanupExpiredEntries(now)

    // Get or create rate limit entry
    const entry = rateLimitStore[clientId] || { count: 0, resetTime: now + config.windowMs }

    // Reset if window has expired
    if (now > entry.resetTime) {
      entry.count = 0
      entry.resetTime = now + config.windowMs
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      const resetIn = Math.ceil((entry.resetTime - now) / 1000)

      return NextResponse.json(
        {
          success: false,
          error: config.message || 'Rate limit exceeded',
          retryAfter: resetIn,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString(),
            'Retry-After': resetIn.toString(),
          },
        }
      )
    }

    // Increment counter
    entry.count++
    rateLimitStore[clientId] = entry

    return null // Allow request to proceed
  }
}

function getClientId(request: NextRequest): string {
  // Try to get user ID from session/auth first
  const userId = request.headers.get('x-user-id')
  if (userId) return `user:${userId}`

  // Fallback to IP address from headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0] : realIp || 'unknown'
  return `ip:${ip}`
}

function cleanupExpiredEntries(now: number) {
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key]
    }
  })
}

// Predefined rate limit configurations
export const rateLimits = {
  // AI endpoints - more restrictive
  ai: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    message: 'Too many AI requests. Please wait before trying again.',
  }),

  // API endpoints - moderate
  api: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    message: 'Too many API requests. Please slow down.',
  }),

  // Authentication - strict
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  }),

  // General - lenient
  general: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Too many requests. Please slow down.',
  }),
}
