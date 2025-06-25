import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { securityHeaders, corsHeaders, sessionSecurity } from '@/lib/security'

interface ExtendedUser {
  id: string
  email: string | null
  name: string | null
  image: string | null
  role?: string
  agencyId?: string | null
  isSuperAdmin?: boolean
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Apply security headers to all responses
  let response = NextResponse.next()
  response = securityHeaders(response)
  
  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    response = corsHeaders(response, origin || undefined)
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers })
    }
  }
  
  // Check session security
  const securityCheck = sessionSecurity(request)
  if (!securityCheck.isSecure && process.env.NODE_ENV === 'production') {
    console.error('Security check failed:', securityCheck.errors)
    return NextResponse.json(
      { error: 'Security requirements not met', details: securityCheck.errors },
      { status: 500 }
    )
  }
  
  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/chat', 
    '/theme', 
    '/settings',
    '/admin',
    '/agency',
    '/api/chat', 
    '/api/conversations', 
    '/api/user', 
    '/api/upload',
    '/api/agency',
    '/api/theme',
    '/api/orders',
    '/api/usage'
  ]
  
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute) {
    try {
      const session = await auth()
      
      if (!session?.user) {
        // Redirect to sign-in for page routes
        if (!pathname.startsWith('/api/')) {
          const signInUrl = new URL('/auth/signin', request.url)
          signInUrl.searchParams.set('callbackUrl', pathname)
          return NextResponse.redirect(signInUrl)
        }
        
        // Return 401 for API routes
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401, headers: response.headers }
        )
      }
      
      const user = session.user as ExtendedUser
      
      // Admin-only routes
      const adminRoutes = ['/admin', '/api/admin']
      const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
      
      if (isAdminRoute && !user.isSuperAdmin) {
        // Redirect non-admins to dashboard
        if (!pathname.startsWith('/api/')) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        
        // Return 403 for API routes
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403, headers: response.headers }
        )
      }
      
      // Agency-specific routes - ensure user has agency
      const agencyRequiredRoutes = ['/chat', '/theme', '/settings/agency', '/api/chat', '/api/conversations', '/api/theme']
      const requiresAgency = agencyRequiredRoutes.some(route => pathname.startsWith(route))
      
      if (requiresAgency && !user.agencyId && !user.isSuperAdmin) {
        // Redirect to agency selection or onboarding
        if (!pathname.startsWith('/api/')) {
          return NextResponse.redirect(new URL('/onboarding/agency', request.url))
        }
        
        // Return error for API routes
        return NextResponse.json(
          { success: false, error: 'Agency selection required' },
          { status: 400, headers: response.headers }
        )
      }
      
      // Add user context to headers for API routes
      if (pathname.startsWith('/api/')) {
        response.headers.set('x-user-id', user.id)
        if (user.agencyId) {
          response.headers.set('x-agency-id', user.agencyId)
        }
        if (user.role) {
          response.headers.set('x-user-role', user.role)
        }
        response.headers.set('x-is-super-admin', String(user.isSuperAdmin || false))
      }
      
    } catch (error) {
      console.error('Authentication error in middleware:', error)
      
      if (!pathname.startsWith('/api/')) {
        const signInUrl = new URL('/auth/signin', request.url)
        return NextResponse.redirect(signInUrl)
      }
      
      return NextResponse.json(
        { success: false, error: 'Authentication error' },
        { status: 500, headers: response.headers }
      )
    }
  }
  
  // Public routes - allow access
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth routes (sign in/out pages)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|auth/signin|auth/error|auth/verify-request).*)',
  ],
}
