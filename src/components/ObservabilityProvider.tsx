'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { initSentry, setUserContext, trackEvent } from '@/lib/observability'
import { useSession } from 'next-auth/react'

// Initialize PostHog
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: false, // We'll handle this manually
    loaded: posthog => {
      if (process.env.NODE_ENV === 'development') posthog.debug()
    },
  })
}

export function ObservabilityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    // Initialize Sentry
    initSentry()

    // Track page views
    const handleRouteChange = (url: string) => {
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.capture('$pageview', { url })
      }
      trackEvent('page_view', { url })
    }

    // Initial page view
    handleRouteChange(window.location.pathname)

    // Listen for route changes
    const originalPush = router.push
    router.push = (...args) => {
      handleRouteChange(args[0] as string)
      return originalPush.apply(router, args)
    }

    return () => {
      router.push = originalPush
    }
  }, [router])

  useEffect(() => {
    // Set user context when session changes
    if (session?.user) {
      setUserContext({
        id: session.user.id!,
        email: session.user.email!,
      })

      // Identify user in PostHog
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.identify(session.user.id!, {
          email: session.user.email,
          name: session.user.name,
        })
      }
    }
  }, [session])

  return <>{children}</>
}

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', event => {
    trackEvent('javascript_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', event => {
    trackEvent('unhandled_promise_rejection', {
      reason: event.reason?.toString(),
    })
  })
}
