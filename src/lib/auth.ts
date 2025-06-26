import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import type { Session, User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

// Extended session type to include additional user properties
interface ExtendedSession extends Session {
  user: {
    id: string
    email: string | null
    name: string | null
    image: string | null
    role?: string
    agencyId?: string | null
    isSuperAdmin?: boolean
  }
}

// Production-ready auth configuration with Google OAuth
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true, // Trust the host in production
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    session: async ({ session, user, token }): Promise<ExtendedSession> => {
      // If user is available from database (normal case)
      if (user) {
        // Fetch full user data including relationships
        const fullUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { 
            id: true, 
            email: true, 
            name: true, 
            image: true,
            role: true,
            agencyId: true,
            isSuperAdmin: true
          },
        })

        if (fullUser) {
          return {
            ...session,
            user: {
              id: fullUser.id,
              email: fullUser.email,
              name: fullUser.name,
              image: fullUser.image,
              role: fullUser.role,
              agencyId: fullUser.agencyId,
              isSuperAdmin: fullUser.isSuperAdmin,
            },
          }
        }
      }

      // Fallback: if user is not available, try to find in database
      if (session.user?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { 
              id: true, 
              email: true, 
              name: true, 
              image: true,
              role: true,
              agencyId: true,
              isSuperAdmin: true
            },
          })

          if (dbUser) {
            return {
              ...session,
              user: {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                image: dbUser.image,
                role: dbUser.role,
                agencyId: dbUser.agencyId,
                isSuperAdmin: dbUser.isSuperAdmin,
              },
            }
          }
        } catch (error) {
          console.error('Error fetching user in session callback:', error)
        }
      }

      // Last resort: return session with minimal user data
      console.warn('Session callback: No complete user data available')
      return {
        ...session,
        user: {
          id: '',
          email: session.user?.email || null,
          name: session.user?.name || null,
          image: session.user?.image || null,
        },
      }
    },
    signIn: async ({ user, account, profile }) => {
      // Log sign in attempts for debugging
      console.log('Google OAuth sign in attempt:', {
        email: user.email,
        provider: account?.provider,
        userId: user.id,
      })

      // Let the adapter handle user creation
      // This prevents conflicts with OAuth account linking
      return true
    },
    redirect({ url, baseUrl }) {
      // Remove any trailing periods from baseUrl
      const cleanBaseUrl = baseUrl.replace(/\.$/, '')
      console.log('Redirect callback:', { url, baseUrl: cleanBaseUrl })

      // Handle sign out - redirect to home
      if (url.includes('/api/auth/signout')) {
        return cleanBaseUrl
      }

      // Redirect to dashboard after sign in
      if (url === cleanBaseUrl || url === '/' || url.includes('/?')) {
        return `${cleanBaseUrl}/dashboard`
      }
      
      // Allow relative callback URLs
      if (url.startsWith('/')) return `${cleanBaseUrl}${url}`
      
      // Allow callback URLs on the same origin
      if (new URL(url).origin === cleanBaseUrl) return url
      
      return `${cleanBaseUrl}/dashboard`
    },
  },
  events: {
    signIn: async ({ user, account, profile, isNewUser }) => {
      console.log('SignIn event:', { 
        userId: user.id, 
        email: user.email,
        isNewUser,
        provider: account?.provider 
      })
    },
    signOut: async (data) => {
      // AdapterSession doesn't include `user`, so we need a runtime guard
      let userId: string | undefined
      let email: string | undefined

      if ('session' in data && data.session) {
        const maybeSession = data.session as unknown
        // Safely access possible user object
        if (
          typeof maybeSession === 'object' &&
          maybeSession !== null &&
          'user' in maybeSession
        ) {
          const u = (maybeSession as { user?: { id?: string; email?: string } }).user
          userId = u?.id
          email = u?.email
        }
      } else if ('token' in data && data.token) {
        userId = data.token.sub
        // `email` isn't guaranteed on JWT; cast defensively
        email = (data.token as unknown as { email?: string }).email
      }

      console.log('SignOut event:', { userId, email })
    },
  },
})

// Helper function to check if user has access to a specific agency
export async function hasAgencyAccess(userId: string, agencyId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { agencyId: true, isSuperAdmin: true }
  })

  // Super admins have access to all agencies
  if (user?.isSuperAdmin) return true
  
  // Regular users only have access to their own agency
  return user?.agencyId === agencyId
}

// Helper function to require authentication
export async function requireAuth() {
  const session = await auth() as ExtendedSession | null
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  
  return session
}

// Helper function to require super admin
export async function requireSuperAdmin() {
  const session = await requireAuth()
  
  if (!session.user.isSuperAdmin) {
    throw new Error('Forbidden: Super admin access required')
  }
  
  return session
}

// Helper function to require agency admin
export async function requireAgencyAdmin(agencyId?: string) {
  const session = await requireAuth()
  
  // Super admins can access any agency
  if (session.user.isSuperAdmin) return session
  
  // Check if user is admin of their agency
  if (session.user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }
  
  // If specific agency is requested, verify access
  if (agencyId && session.user.agencyId !== agencyId) {
    throw new Error('Forbidden: Access denied to this agency')
  }
  
  return session
}
