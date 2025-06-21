import { NextRequest, NextResponse } from 'next/server'

export function securityHeaders(response: NextResponse): NextResponse {
  // Security headers for production
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline and unsafe-eval
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openrouter.ai https://api.cloudinary.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  return response
}

export function corsHeaders(response: NextResponse, origin?: string): NextResponse {
  // CORS headers for API routes
  const allowedOrigins = [
    'http://localhost:3001',
    'https://rylie-seo-hub.vercel.app',
    process.env.NEXTAUTH_URL,
  ].filter(Boolean)

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  )
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400') // 24 hours

  return response
}

export function sessionSecurity(request: NextRequest): {
  isSecure: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check for secure session requirements
  if (process.env.NODE_ENV === 'production') {
    // Ensure HTTPS in production
    if (!request.url.startsWith('https://')) {
      errors.push('HTTPS required in production')
    }

    // Check for secure cookies (Note: RequestCookie doesn't have secure property in Next.js)
    // This would be handled by NextAuth.js configuration
  }

  // Check for required environment variables
  const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ]

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`)
    }
  }

  return {
    isSecure: errors.length === 0,
    errors,
  }
}

export function validateApiKey(request: NextRequest, requiredKey: string): boolean {
  const apiKey =
    request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
  return apiKey === requiredKey
}

export function getClientInfo(request: NextRequest): {
  ip: string
  userAgent: string
  origin: string
} {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0] : realIp || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const origin = request.headers.get('origin') || 'unknown'

  return { ip, userAgent, origin }
}
