import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import prisma from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            id: true,
            role: true,
            agencyId: true,
            isSuperAdmin: true,
          },
        })

        if (user) {
          session.user.id = user.id
          session.user.role = user.role
          session.user.agencyId = user.agencyId
          session.user.isSuperAdmin = user.isSuperAdmin
        }
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
}