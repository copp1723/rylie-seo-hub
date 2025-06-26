import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReportExecutor } from '@/lib/services/report-executor'
import { logGA4AuthEvent, AuditAction } from '@/lib/audit'

interface RouteParams {
  params: {
    executionId: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth()
    const { executionId } = params

    // Fetch the execution with schedule details
    const execution = await prisma.reportExecutionHistory.findUnique({
      where: { id: executionId },
      include: {
        schedule: {
          include: {
            user: true,
            agency: true
          }
        }
      }
    })

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canRetry = session.user.isSuperAdmin || 
      (session.user.role === 'admin' && session.user.agencyId === execution.agencyId) ||
      session.user.id === execution.schedule.userId

    if (!canRetry) {
      return NextResponse.json(
        { error: 'Insufficient permissions to retry this report' },
        { status: 403 }
      )
    }

    // Check if execution can be retried
    if (execution.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed executions can be retried' },
        { status: 400 }
      )
    }

    // Check if schedule is paused
    if (execution.schedule.isPaused) {
      // Resume the schedule if retrying
      await prisma.reportSchedule.update({
        where: { id: execution.schedule.id },
        data: {
          isPaused: false,
          pausedReason: null
        }
      })

      await logGA4AuthEvent(
        AuditAction.GA4_REPORT_SCHEDULE_RESUMED,
        session.user.id,
        session.user.email || 'unknown',
        {
          scheduleId: execution.schedule.id,
          reason: 'Manual retry initiated'
        }
      )
    }

    // Log retry attempt
    await logGA4AuthEvent(
      AuditAction.GA4_REPORT_RETRY,
      session.user.id,
      session.user.email || 'unknown',
      {
        executionId,
        scheduleId: execution.schedule.id,
        previousError: execution.error,
        previousErrorCode: execution.errorCode
      }
    )

    // Retry the execution
    const result = await ReportExecutor.retryFailedExecution(executionId)

    return NextResponse.json({
      success: result.success,
      executionId: result.executionId,
      message: result.success 
        ? 'Report retry initiated successfully'
        : `Retry failed: ${result.error}`,
      error: result.error,
      errorCode: result.errorCode
    })
  } catch (error) {
    console.error('Error retrying report:', error)
    return NextResponse.json(
      { error: 'Failed to retry report execution' },
      { status: 500 }
    )
  }
}