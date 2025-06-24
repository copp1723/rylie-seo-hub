'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { initSentry, setUserContext, trackEvent } from '@/lib/observability'
import { useSession } from 'next-auth/react'

// Initialize PostHog only if properly configured
if (typeof window !== 'undefined' && 
    process.env.NEXT_PUBLIC_POSTHOG_KEY && 
    process.env.NEXT_PUBLIC_POSTHOG_KEY !== 'placeholder-posthog-key' &&
    process.env.NEXT_PUBLIC_POSTHOG_KEY.length > 10) {
  try {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: false, // We'll handle this manually
      loaded: posthog => {
        if (process.env.NODE_ENV === 'development') posthog.debug()
      },
    })
  } catch (error) {
    console.warn('PostHog initialization failed:', error)
  }
}

export function ObservabilityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    // Initialize Sentry only if properly configured
    try {
      initSentry()
    } catch (error) {
      console.warn('Sentry initialization failed:', error)
    }

    // Track page views
    const handleRouteChange = (url: string) => {
      try {
        if (typeof window !== 'undefined' && window.posthog) {
          window.posthog.capture('$pageview', { url })
        }
        trackEvent('page_view', { url })
      } catch (error) {
        console.warn('Page view tracking failed:', error)
      }
    }

    // Initial page view
    try {
      handleRouteChange(window.location.pathname)
    } catch (error) {
      console.warn('Initial page view tracking failed:', error)
    }

    // Listen for route changes
    const originalPush = router.push
    router.push = (...args) => {
      try {
        handleRouteChange(args[0] as string)
      } catch (error) {
        console.warn('Route change tracking failed:', error)
      }
      return originalPush.apply(router, args)
    }

    return () => {
      router.push = originalPush
    }
  }, [router])

  useEffect(() => {
    // Set user context when session changes
    if (session?.user) {
      try {
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
      } catch (error) {
        console.warn('User context setting failed:', error)
      }
    }
  }, [session])

  return <>{children}</>
}

// Global error handler with better error handling
if (typeof window !== 'undefined') {
  window.addEventListener('error', event => {
    try {
      trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    } catch (error) {
      console.warn('Error tracking failed:', error)
    }
  })

  window.addEventListener('unhandledrejection', event => {
    try {
      trackEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
      })
    } catch (error) {
      console.warn('Promise rejection tracking failed:', error)
    }
  })
}

