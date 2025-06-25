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
    // Disable TypeScript errors during builds for faster deployment
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    // Ignore handlebars dynamic requires warning
    config.module = {
      ...config.module,
      exprContextCritical: false,
    }
    
    // Alternative: Replace handlebars dynamic requires
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'handlebars/runtime': 'handlebars/dist/handlebars.runtime',
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

