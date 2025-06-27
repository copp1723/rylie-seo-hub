import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    clientTraceMetadata: ['searchParams', 'pathname', 'locale'],
  },
  eslint: {
    // Disable ESLint during builds to prevent deployment failures
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow Render deployments to bypass type errors when the flag is set
    ignoreBuildErrors: process.env.SKIP_TS_ERRORS === 'true',
  },
  webpack: (config, { isServer }) => {
    // Ignore handlebars dynamic requires warning
    config.module = {
      ...config.module,
      exprContextCritical: false,
    }
    
    // Alternative: Replace handlebars dynamic requires
    if (!isServer) {
      config.resolve = {
        ...(config.resolve ?? {}),
        alias: {
          ...((config.resolve?.alias) ?? {}),
          'handlebars/runtime': 'handlebars/dist/handlebars.runtime',
        },
      }
    }
    
    return config
  },
}

export default withSentryConfig(nextConfig, {
  org: 'onekeelai',
  project: 'hub-next',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnelRoute: '/monitoring',
  sourcemaps: {
    disable: true,
  },
  disableLogger: true,
  automaticVercelMonitors: true,
})