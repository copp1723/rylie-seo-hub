'use client'

import { useSession } from 'next-auth/react'
import { SignInPage } from '@/components/auth/SignInPage'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (session?.user) {
      redirect('/dashboard')
    }
  }, [session])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto"></div>
          <p className="text-muted-foreground">Loading Rylie SEO Hub...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Professional Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container-professional">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">R</span>
                </div>
                <h1 className="text-xl font-bold text-foreground">Rylie SEO Hub</h1>
              </div>
              <div className="text-sm text-muted-foreground">AI-Powered SEO Assistant</div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="container-professional section-padding">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4 fade-in">
              <h1 className="text-5xl font-bold text-foreground">
                Professional SEO Services
                <span className="block text-primary">Powered by AI</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Transform your automotive dealership's online presence with intelligent SEO
                strategies, real-time optimization, and data-driven insights.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-3 gap-6 my-12">
              <div className="card-professional p-6 text-center hover-lift">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">AI-Powered Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced algorithms analyze your content and provide actionable SEO
                  recommendations
                </p>
              </div>

              <div className="card-professional p-6 text-center hover-lift">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Real-Time Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor your SEO performance with live analytics and competitive intelligence
                </p>
              </div>

              <div className="card-professional p-6 text-center hover-lift">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">White-Label Ready</h3>
                <p className="text-sm text-muted-foreground">
                  Fully customizable platform that matches your agency's brand and identity
                </p>
              </div>
            </div>

            {/* Sign In Section */}
            <div className="max-w-md mx-auto">
              <div className="card-professional p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold mb-2">Get Started Today</h2>
                  <p className="text-muted-foreground">
                    Sign in to access your personalized SEO dashboard
                  </p>
                </div>
                <SignInPage />
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 pt-8 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Trusted by automotive professionals
              </p>
              <div className="flex items-center justify-center space-x-8 opacity-60">
                <div className="text-xs font-medium">Enterprise Security</div>
                <div className="text-xs font-medium">99.9% Uptime</div>
                <div className="text-xs font-medium">24/7 Support</div>
                <div className="text-xs font-medium">GDPR Compliant</div>
              </div>
            </div>
          </div>
        </main>

        {/* Professional Footer */}
        <footer className="border-t bg-card/50 mt-16">
          <div className="container-professional py-8">
            <div className="text-center text-sm text-muted-foreground">
              <p>
                &copy; 2024 Rylie SEO Hub. Professional SEO services for automotive dealerships.
              </p>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  return null
}
