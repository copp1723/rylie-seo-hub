import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { securityHeaders, corsHeaders, sessionSecurity } from '@/lib/security'

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
  const protectedRoutes = ['/chat', '/theme', '/api/chat', '/api/conversations', '/api/user', '/api/upload']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute) {
    try {
      const session = await auth()
      
      if (!session?.user) {
        // Redirect to sign-in for page routes
        if (!pathname.startsWith('/api/')) {
          const signInUrl = new URL('/', request.url)
          return NextResponse.redirect(signInUrl)
        }
        
        // Return 401 for API routes
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401, headers: response.headers }
        )
      }
      
      // Add user ID to headers for API routes
      if (pathname.startsWith('/api/') && session.user.id) {
        response.headers.set('x-user-id', session.user.id)
      }
      
    } catch (error) {
      console.error('Authentication error in middleware:', error)
      
      if (!pathname.startsWith('/api/')) {
        const signInUrl = new URL('/', request.url)
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
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}

