import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { FEATURE_FLAGS } from '@/lib/feature-flags'

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    checks: {
      database: false,
      auth: false,
      features: {
        requestsTerminology: FEATURE_FLAGS.USE_REQUESTS_TERMINOLOGY,
      },
    },
  }

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.checks.database = true
  } catch (error) {
    checks.status = 'degraded'
    console.error('Database health check failed:', error)
  }

  // Check auth configuration
  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET) {
    checks.checks.auth = true
  } else {
    checks.status = 'degraded'
  }

  // Overall status
  const allChecks = Object.values(checks.checks).filter(v => typeof v === 'boolean')
  if (allChecks.every(check => check === true)) {
    checks.status = 'healthy'
  } else if (allChecks.some(check => check === true)) {
    checks.status = 'degraded'
  } else {
    checks.status = 'unhealthy'
  }

  return NextResponse.json(checks, {
    status: checks.status === 'healthy' ? 200 : 503,
  })
}
