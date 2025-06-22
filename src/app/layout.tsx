import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { ObservabilityProvider } from '@/components/ObservabilityProvider'
import { FeatureFlagProvider } from '@/components/FeatureFlagProvider'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Rylie SEO Hub - AI-Powered SEO Assistant',
  description: 'Professional SEO services powered by AI for automotive dealerships',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="en" className={`${inter.variable} font-sans`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <SessionProvider session={session}>
          <ObservabilityProvider>
            <FeatureFlagProvider>
              <div className="relative flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
              </div>
            </FeatureFlagProvider>
          </ObservabilityProvider>
        </SessionProvider>
      </body>
    </html>
  )
}