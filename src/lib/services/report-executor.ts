import { prisma } from '@/lib/prisma'
import { ReportGenerator, ReportTemplateType } from './report-generator'
import { GA4Service } from '@/lib/ga4/service'
import { getGA4Tokens } from '@/lib/ga4/tokens'
import { sendEmail } from '@/lib/email'
import { logGA4AuthEvent, AuditAction } from '@/lib/audit'
import type { ReportSchedule, ReportExecutionHistory } from '@prisma/client'
import { differenceInMinutes } from 'date-fns'

export enum ExecutionErrorCode {
  OAUTH_EXPIRED = 'OAUTH_EXPIRED',
  OAUTH_INVALID = 'OAUTH_INVALID',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  PROPERTY_ACCESS_DENIED = 'PROPERTY_ACCESS_DENIED',
  GENERATION_FAILED = 'GENERATION_FAILED',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ReportExecutionResult {
  success: boolean
  executionId: string
  error?: string
  errorCode?: ExecutionErrorCode
  reportUrl?: string
  shouldRetry?: boolean
  retryAfter?: Date
}

interface ExecutionOptions {
  isManualRetry?: boolean
  forceSend?: boolean
}

export class ReportExecutor {
  private static readonly MAX_RETRY_ATTEMPTS = 3
  private static readonly PAUSE_AFTER_CONSECUTIVE_FAILURES = 5
  private static readonly BASE_RETRY_DELAY_MINUTES = 5

  /**
   * Execute a scheduled report
   */
  static async executeReport(
    schedule: ReportSchedule,
    options: ExecutionOptions = {}
  ): Promise<ReportExecutionResult> {
    // Create execution history record
    const execution = await prisma.reportExecutionHistory.create({
      data: {
        scheduleId: schedule.id,
        agencyId: schedule.agencyId,
        status: 'running',
        startedAt: new Date(),
        attemptCount: 1,
        metadata: {
          reportType: schedule.reportType,
          isManualRetry: options.isManualRetry || false
        }
      }
    })

    try {
      // Step 1: Validate GA4 tokens
      const tokens = await getGA4Tokens(schedule.userId)
      if (!tokens) {
        throw await this.handleError(
          execution.id,
          'No GA4 tokens found for user',
          ExecutionErrorCode.OAUTH_INVALID
        )
      }

      // Step 2: Create GA4 service and verify property access
      const ga4Service = await GA4Service.createForUser(schedule.userId)
      const hasAccess = await ga4Service.verifyPropertyAccess(schedule.ga4PropertyId)
      
      if (!hasAccess) {
        throw await this.handleError(
          execution.id,
          `No access to GA4 property ${schedule.ga4PropertyId}`,
          ExecutionErrorCode.PROPERTY_ACCESS_DENIED
        )
      }

      // Step 3: Fetch GA4 data
      const dateRange = this.getDateRangeForReportType(schedule.reportType)
      const reportData = await this.fetchGA4Data(
        ga4Service,
        schedule.ga4PropertyId,
        dateRange
      )

      // Step 4: Generate report
      const branding = schedule.brandingOptionsJson 
        ? JSON.parse(schedule.brandingOptionsJson)
        : {}
      
      const generator = new ReportGenerator(branding)
      const { html, pdf } = await generator.generateReport(
        schedule.reportType as ReportTemplateType,
        reportData,
        dateRange
      )

      // Step 5: Upload report (implement your storage solution)
      const reportUrl = await this.uploadReport(pdf, schedule, execution.id)

      // Step 6: Send emails
      if (schedule.emailRecipients.length > 0 && !options.forceSend) {
        await this.sendReportEmails(
          schedule,
          reportUrl,
          html,
          pdf
        )
      }

      // Step 7: Update execution as successful
      await prisma.reportExecutionHistory.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          reportUrl,
          emailsSent: schedule.emailRecipients.length > 0
        }
      })

      // Update schedule with success
      await prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastExecutionId: execution.id,
          lastRun: new Date(),
          lastSuccessAt: new Date(),
          consecutiveFailures: 0,
          isPaused: false,
          pausedReason: null
        }
      })

      // Log success
      await logGA4AuthEvent(
        AuditAction.GA4_REPORT_GENERATED,
        schedule.userId,
        schedule.emailRecipients[0] || 'unknown',
        {
          scheduleId: schedule.id,
          executionId: execution.id,
          reportType: schedule.reportType,
          propertyId: schedule.ga4PropertyId
        }
      )

      return {
        success: true,
        executionId: execution.id,
        reportUrl
      }

    } catch (error) {
      return await this.handleExecutionFailure(
        schedule,
        execution,
        error,
        options
      )
    }
  }

  /**
   * Handle execution failure with retry logic
   */
  private static async handleExecutionFailure(
    schedule: ReportSchedule,
    execution: ReportExecutionHistory,
    error: any,
    options: ExecutionOptions
  ): Promise<ReportExecutionResult> {
    const errorCode = this.determineErrorCode(error)
    const shouldRetry = this.shouldRetry(errorCode, execution.attemptCount)
    const retryAfter = shouldRetry 
      ? this.calculateRetryTime(execution.attemptCount)
      : undefined

    // Update execution record
    await prisma.reportExecutionHistory.update({
      where: { id: execution.id },
      data: {
        status: shouldRetry ? 'failed' : 'failed',
        failedAt: new Date(),
        error: error.message || 'Unknown error',
        errorCode,
        retryAfter
      }
    })

    // Update schedule failure tracking
    const newConsecutiveFailures = schedule.consecutiveFailures + 1
    const shouldPause = newConsecutiveFailures >= this.PAUSE_AFTER_CONSECUTIVE_FAILURES

    await prisma.reportSchedule.update({
      where: { id: schedule.id },
      data: {
        lastExecutionId: execution.id,
        consecutiveFailures: newConsecutiveFailures,
        lastFailureAt: new Date(),
        isPaused: shouldPause,
        pausedReason: shouldPause 
          ? `Paused after ${newConsecutiveFailures} consecutive failures: ${error.message}`
          : undefined
      }
    })

    // Send alert for critical errors
    if (this.isCriticalError(errorCode) || shouldPause) {
      await this.sendFailureAlert(schedule, execution, error, errorCode)
    }

    // Log failure
    await logGA4AuthEvent(
      AuditAction.GA4_REPORT_FAILED,
      schedule.userId,
      schedule.emailRecipients[0] || 'unknown',
      {
        scheduleId: schedule.id,
        executionId: execution.id,
        errorCode,
        error: error.message,
        attemptCount: execution.attemptCount,
        willRetry: shouldRetry
      }
    )

    return {
      success: false,
      executionId: execution.id,
      error: error.message,
      errorCode,
      shouldRetry,
      retryAfter
    }
  }

  /**
   * Retry a failed execution
   */
  static async retryFailedExecution(
    executionId: string
  ): Promise<ReportExecutionResult> {
    const failedExecution = await prisma.reportExecutionHistory.findUnique({
      where: { id: executionId },
      include: { schedule: true }
    })

    if (!failedExecution) {
      throw new Error('Execution not found')
    }

    if (failedExecution.status !== 'failed') {
      throw new Error('Can only retry failed executions')
    }

    // Create new execution record for retry
    const retryExecution = await prisma.reportExecutionHistory.create({
      data: {
        scheduleId: failedExecution.scheduleId,
        agencyId: failedExecution.agencyId,
        status: 'running',
        startedAt: new Date(),
        attemptCount: failedExecution.attemptCount + 1,
        metadata: {
          ...((failedExecution.metadata as any) || {}),
          retriedFromExecutionId: executionId,
          isManualRetry: true
        }
      }
    })

    // Execute with the retry execution
    return this.executeReport(failedExecution.schedule, {
      isManualRetry: true
    })
  }

  /**
   * Determine error code from error
   */
  private static determineErrorCode(error: any): ExecutionErrorCode {
    const message = error.message?.toLowerCase() || ''
    
    if (message.includes('invalid_grant') || message.includes('token') || message.includes('expired')) {
      return ExecutionErrorCode.OAUTH_EXPIRED
    }
    if (message.includes('rate limit') || message.includes('quota')) {
      return ExecutionErrorCode.API_RATE_LIMIT
    }
    if (message.includes('permission') || message.includes('access denied')) {
      return ExecutionErrorCode.PROPERTY_ACCESS_DENIED
    }
    if (message.includes('email') || message.includes('smtp')) {
      return ExecutionErrorCode.EMAIL_SEND_FAILED
    }
    if (message.includes('pdf') || message.includes('generation')) {
      return ExecutionErrorCode.GENERATION_FAILED
    }
    
    return ExecutionErrorCode.UNKNOWN_ERROR
  }

  /**
   * Determine if error should trigger retry
   */
  private static shouldRetry(
    errorCode: ExecutionErrorCode,
    attemptCount: number
  ): boolean {
    if (attemptCount >= this.MAX_RETRY_ATTEMPTS) {
      return false
    }

    // Don't retry auth errors - need user intervention
    if (errorCode === ExecutionErrorCode.OAUTH_EXPIRED || 
        errorCode === ExecutionErrorCode.OAUTH_INVALID ||
        errorCode === ExecutionErrorCode.PROPERTY_ACCESS_DENIED) {
      return false
    }

    // Retry transient errors
    return [
      ExecutionErrorCode.API_RATE_LIMIT,
      ExecutionErrorCode.EMAIL_SEND_FAILED,
      ExecutionErrorCode.GENERATION_FAILED,
      ExecutionErrorCode.UNKNOWN_ERROR
    ].includes(errorCode)
  }

  /**
   * Calculate retry time with exponential backoff
   */
  private static calculateRetryTime(attemptCount: number): Date {
    const delayMinutes = this.BASE_RETRY_DELAY_MINUTES * Math.pow(2, attemptCount - 1)
    return new Date(Date.now() + delayMinutes * 60 * 1000)
  }

  /**
   * Check if error is critical and needs immediate alert
   */
  private static isCriticalError(errorCode: ExecutionErrorCode): boolean {
    return [
      ExecutionErrorCode.OAUTH_EXPIRED,
      ExecutionErrorCode.OAUTH_INVALID,
      ExecutionErrorCode.PROPERTY_ACCESS_DENIED
    ].includes(errorCode)
  }

  /**
   * Send failure alert to admins
   */
  private static async sendFailureAlert(
    schedule: ReportSchedule,
    execution: ReportExecutionHistory,
    error: any,
    errorCode: ExecutionErrorCode
  ): Promise<void> {
    // Get agency admins
    const admins = await prisma.user.findMany({
      where: {
        agencyId: schedule.agencyId,
        role: 'admin'
      }
    })

    const subject = `[ALERT] Report Generation Failed - ${schedule.reportType}`
    const message = `
      Report generation has failed for schedule ${schedule.id}.
      
      Error: ${error.message}
      Error Code: ${errorCode}
      Consecutive Failures: ${schedule.consecutiveFailures}
      
      ${schedule.isPaused ? 'The schedule has been automatically paused.' : ''}
      
      Please review and take appropriate action.
    `

    // Send to all admins
    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject,
        text: message,
        html: message.replace(/\n/g, '<br>')
      })
    }
  }

  /**
   * Handle specific error and throw with proper message
   */
  private static async handleError(
    executionId: string,
    message: string,
    errorCode: ExecutionErrorCode
  ): Promise<Error> {
    await prisma.reportExecutionHistory.update({
      where: { id: executionId },
      data: {
        status: 'failed',
        failedAt: new Date(),
        error: message,
        errorCode
      }
    })
    
    const error = new Error(message)
    ;(error as any).code = errorCode
    return error
  }

  /**
   * Get date range based on report type
   */
  private static getDateRangeForReportType(reportType: string) {
    const endDate = new Date()
    const startDate = new Date()
    
    switch (reportType) {
      case 'WeeklySummary':
        startDate.setDate(endDate.getDate() - 7)
        break
      case 'MonthlyReport':
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case 'QuarterlyBusinessReview':
        startDate.setMonth(endDate.getMonth() - 3)
        break
      default:
        startDate.setDate(endDate.getDate() - 7)
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  /**
   * Fetch GA4 data for report
   */
  private static async fetchGA4Data(
    ga4Service: GA4Service,
    propertyId: string,
    dateRange: { startDate: string; endDate: string }
  ) {
    // This would call your GA4 service methods to get the required data
    // For now, returning mock data structure
    return {
      organicTraffic: 1234,
      organicSessions: 2345,
      engagementRate: 0.65,
      conversions: 45,
      topPages: [],
      topKeywords: []
    }
  }

  /**
   * Upload report to storage
   */
  private static async uploadReport(
    pdf: Buffer,
    schedule: ReportSchedule,
    executionId: string
  ): Promise<string> {
    // Implement your storage solution here (S3, Cloudinary, etc.)
    // For now, returning a mock URL
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `https://storage.example.com/reports/${schedule.agencyId}/${executionId}-${timestamp}.pdf`
  }

  /**
   * Send report emails
   */
  private static async sendReportEmails(
    schedule: ReportSchedule,
    reportUrl: string,
    html: string,
    pdf: Buffer
  ): Promise<void> {
    const subject = `Your ${schedule.reportType} Report is Ready`
    
    for (const recipient of schedule.emailRecipients) {
      await sendEmail({
        to: recipient,
        subject,
        html,
        attachments: [{
          filename: `${schedule.reportType}-${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdf
        }]
      })
    }
  }
}