import * as Sentry from '@sentry/nextjs'
import React from 'react'

// Extend Window interface for PostHog
declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, any>) => void
      identify: (userId: string, properties?: Record<string, any>) => void
      debug: () => void
    }
  }
}

// Structured logging system
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    const logEntry = {
      level: 'info',
      message,
      ...meta,
      timestamp: new Date().toISOString(),
      service: 'rylie-seo-hub',
    }
    console.log(JSON.stringify(logEntry))
  },

  error: (message: string, error?: Error | unknown, meta?: Record<string, any>) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    const logEntry = {
      level: 'error',
      message,
      error: errorMessage,
      stack: errorStack,
      ...meta,
      timestamp: new Date().toISOString(),
      service: 'rylie-seo-hub',
    }
    console.error(JSON.stringify(logEntry))

    // Send to Sentry
    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: { service: 'rylie-seo-hub' },
        extra: meta as Record<string, any>,
      })
    } else {
      Sentry.captureMessage(message, 'error')
    }
  },

  warn: (message: string, meta?: Record<string, any>) => {
    const logEntry = {
      level: 'warn',
      message,
      ...meta,
      timestamp: new Date().toISOString(),
      service: 'rylie-seo-hub',
    }
    console.warn(JSON.stringify(logEntry))
  },

  business: (event: string, properties: Record<string, any>) => {
    const logEntry = {
      level: 'business',
      event,
      properties,
      timestamp: new Date().toISOString(),
      service: 'rylie-seo-hub',
    }
    console.log(JSON.stringify(logEntry))

    // Track business events
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture(event, properties)
    }
  },
}

// Business event tracking
export const trackEvent = (event: string, properties: Record<string, any> = {}) => {
  try {
    // Log for server-side tracking
    logger.business(event, properties)

    // Client-side tracking
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture(event, {
        ...properties,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    logger.error('Failed to track event', error as Error, { event, properties })
  }
}

// Performance monitoring
export const performanceTracker = {
  startTimer: (operation: string) => {
    const startTime = Date.now()
    return {
      end: (metadata?: Record<string, any>) => {
        const duration = Date.now() - startTime
        logger.info(`Performance: ${operation}`, {
          operation,
          duration_ms: duration,
          ...metadata,
        })

        // Track slow operations
        if (duration > 1000) {
          logger.warn(`Slow operation detected: ${operation}`, {
            operation,
            duration_ms: duration,
            ...metadata,
          })
        }

        return duration
      },
    }
  },

  trackApiCall: async (endpoint: string, method: string, fn: () => Promise<any>) => {
    const timer = performanceTracker.startTimer(`API ${method} ${endpoint}`)
    try {
      const result = await fn()
      timer.end({ status: 'success', endpoint, method })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      timer.end({ status: 'error', endpoint, method, error: errorMessage })
      throw error
    }
  },
}

// Error boundary for React components
export const withErrorBoundary = (Component: React.ComponentType<any>) => {
  return Sentry.withErrorBoundary(Component, {
    fallback: ({ error, resetError }: any) => {
      return React.createElement('div', { className: 'p-6 text-center' }, [
        React.createElement(
          'h2',
          {
            key: 'title',
            className: 'text-xl font-semibold text-red-600 mb-2',
          },
          'Something went wrong'
        ),
        React.createElement(
          'p',
          {
            key: 'message',
            className: 'text-gray-600 mb-4',
          },
          "We've been notified and are working on a fix."
        ),
        React.createElement(
          'button',
          {
            key: 'button',
            onClick: resetError,
            className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600',
          },
          'Try Again'
        ),
      ])
    },
    beforeCapture: (scope, error, errorInfo) => {
      scope.setTag('component', 'error-boundary')
      scope.setExtra('errorInfo', errorInfo)
    },
  })
}

// Initialize Sentry
export const initSentry = () => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        // Filter out development errors
        if (process.env.NODE_ENV === 'development') {
          return null
        }
        return event
      },
    })
  }
}

// User context for better error tracking
export const setUserContext = (user: { id: string; email?: string; tenantId?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  })

  Sentry.setTag('tenant_id', user.tenantId)

  // Track user session
  trackEvent('user_session_start', {
    user_id: user.id,
    tenant_id: user.tenantId,
  })
}

// Clear user context on logout
export const clearUserContext = () => {
  Sentry.setUser(null)
  trackEvent('user_session_end')
}

// Export observability object for backward compatibility
export const observability = {
  logger,
  trackEvent,
  performanceTracker,
  withErrorBoundary,
  initSentry,
  setUserContext,
  clearUserContext,
}
