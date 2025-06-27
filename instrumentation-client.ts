import * as Sentry from '@sentry/nextjs'

// Add the Sentry router transition start hook as required
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart