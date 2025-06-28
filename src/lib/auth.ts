import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import prisma from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            // GA4 scopes
            'https://www.googleapis.com/auth/analytics.readonly',
            // Search Console scopes
            'https://www.googleapis.com/auth/webmasters.readonly',
            'https://www.googleapis.com/auth/siteverification.verify_only'
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, account }) => {
      // Initial sign in
      if (account && user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            role: true,
            agencyId: true,
            isSuperAdmin: true,
          },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.agencyId = dbUser.agencyId
          token.isSuperAdmin = dbUser.isSuperAdmin
        }
      }
      return token
    },
    session: async ({ session, token }) => {
      // Just read from token, no DB call
      if (session?.user && token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.agencyId = token.agencyId as string | null
        session.user.isSuperAdmin = token.isSuperAdmin as boolean
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
})

// Helper function for API routes
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session
}