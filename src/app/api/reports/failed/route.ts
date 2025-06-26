import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAgencyAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Query params schema
const querySchema = z.object({
  agencyId: z.string().optional(),
  status: z.enum(['failed', 'all']).optional().default('failed'),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0)
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    
    // Parse query params
    const params = querySchema.parse({
      agencyId: searchParams.get('agencyId') || undefined,
      status: searchParams.get('status') || 'failed',
      limit: searchParams.get('limit') || '20',
      offset: searchParams.get('offset') || '0'
    })

    // Build where clause based on user permissions
    let whereClause: any = {}
    
    if (session.user.isSuperAdmin) {
      // Super admins can see all failed reports
      if (params.agencyId) {
        whereClause.agencyId = params.agencyId
      }
    } else if (session.user.role === 'admin' && session.user.agencyId) {
      // Agency admins can only see their agency's reports
      whereClause.agencyId = session.user.agencyId
    } else {
      // Regular users cannot access this endpoint
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Add status filter
    if (params.status === 'failed') {
      whereClause.status = 'failed'
    }

    // Fetch failed report executions with schedule details
    const [executions, total] = await Promise.all([
      prisma.reportExecutionHistory.findMany({
        where: whereClause,
        include: {
          schedule: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true
                }
              },
              agency: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          failedAt: 'desc'
        },
        take: params.limit,
        skip: params.offset
      }),
      prisma.reportExecutionHistory.count({ where: whereClause })
    ])

    // Format response
    const formattedExecutions = executions.map(exec => ({
      id: exec.id,
      scheduleId: exec.scheduleId,
      status: exec.status,
      attemptCount: exec.attemptCount,
      failedAt: exec.failedAt,
      error: exec.error,
      errorCode: exec.errorCode,
      retryAfter: exec.retryAfter,
      canRetry: exec.status === 'failed' && (exec.attemptCount || 0) < 3,
      schedule: {
        id: exec.schedule.id,
        reportType: exec.schedule.reportType,
        ga4PropertyId: exec.schedule.ga4PropertyId,
        isPaused: exec.schedule.isPaused,
        consecutiveFailures: exec.schedule.consecutiveFailures,
        user: exec.schedule.user,
        agency: exec.schedule.agency
      }
    }))

    return NextResponse.json({
      executions: formattedExecutions,
      pagination: {
        total,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < total
      }
    })
  } catch (error) {
    console.error('Error fetching failed reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}