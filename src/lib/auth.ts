import NextAuth from 'next-auth'
import Email from 'next-auth/providers/email'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

// Production-ready auth configuration with magic link
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true, // Trust the host in production
  providers: [
    Email({
      server: {
        host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || 'noreply@rylie-seo-hub.com',
    }),
  ],
  pages: {
    signIn: '/',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    session: async ({ session, user, token }) => {
      // If user is available from database (normal case)
      if (user) {
        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
          },
        }
      }
      
      // Fallback: if user is not available, try to find in database
      if (session.user?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, email: true, name: true, image: true }
          })
          
          if (dbUser) {
            return {
              ...session,
              user: {
                ...session.user,
                id: dbUser.id,
              },
            }
          }
        } catch (error) {
          console.error('Error fetching user in session callback:', error)
        }
      }
      
      // Last resort: return session without user ID (will cause invite to fail gracefully)
      console.warn('Session callback: No user ID available')
      return session
    },
    signIn: async ({ user, account, profile }) => {
      // Log sign in attempts for debugging
      console.log('Magic link sign in attempt:', { 
        email: user.email,
        provider: account?.provider,
        userId: user.id 
      })
      
      try {
        // Ensure user exists in database with proper defaults
        if (user.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })
          
          if (!existingUser) {
            console.log('Creating user in database:', user.email)
            await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || null,
                image: user.image || null,
                role: 'user',
                isSuperAdmin: false,
              }
            })
            console.log('User created successfully in database')
          } else {
            console.log('User already exists in database:', existingUser.id)
          }
        }
      } catch (error) {
        console.error('Error ensuring user exists in database:', error)
        // Don't block sign in if user creation fails
      }
      
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
}))
