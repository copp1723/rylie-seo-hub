import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

// Production-ready auth configuration
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true, // Trust the host in production
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.manage.users.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: '/',
  },
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
    signIn: async ({ user, account, profile }) => {
      // Log sign in attempts for debugging
      console.log('Sign in attempt:', { 
        email: user.email,
        provider: account?.provider,
        userId: user.id 
      })
      
      // Always allow sign in - the adapter will create the user if needed
      return true
    },
    redirect({ url, baseUrl }) {
      console.log('Redirect callback:', { url, baseUrl })
      
      // Redirect to dashboard after sign in
      if (url === baseUrl || url === '/' || url.includes('/?')) {
        return `${baseUrl}/dashboard`
      }
      // Allow relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    },
  },
})
