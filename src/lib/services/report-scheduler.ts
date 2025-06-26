import { prisma } from '@/lib/prisma'
import { ReportExecutor } from './report-executor'
import * as cron from 'node-cron'
import { differenceInMinutes } from 'date-fns'

export class ReportScheduler {
  private static tasks: Map<string, cron.ScheduledTask> = new Map()
  private static retryInterval: NodeJS.Timer | null = null

  /**
   * Initialize the report scheduler
   */
  static async initialize() {
    console.log('Initializing report scheduler...')
    
    // Load all active schedules
    await this.loadActiveSchedules()
    
    // Start retry checker (runs every 5 minutes)
    this.startRetryChecker()
    
    console.log('Report scheduler initialized')
  }

  /**
   * Load and schedule all active report schedules
   */
  static async loadActiveSchedules() {
    try {
      const schedules = await prisma.reportSchedule.findMany({
        where: {
          isActive: true,
          isPaused: false
        }
      })

      console.log(`Loading ${schedules.length} active schedules`)

      for (const schedule of schedules) {
        this.scheduleReport(schedule)
      }
    } catch (error) {
      console.error('Error loading active schedules:', error)
    }
  }

  /**
   * Schedule a single report
   */
  static scheduleReport(schedule: any) {
    // Remove existing task if any
    this.unscheduleReport(schedule.id)

    try {
      // Validate cron pattern
      if (!cron.validate(schedule.cronPattern)) {
        console.error(`Invalid cron pattern for schedule ${schedule.id}: ${schedule.cronPattern}`)
        return
      }

      // Create scheduled task
      const task = cron.schedule(
        schedule.cronPattern,
        async () => {
          console.log(`Executing scheduled report ${schedule.id} - ${schedule.reportType}`)
          
          try {
            const result = await ReportExecutor.executeReport(schedule)
            
            if (result.success) {
              console.log(`Report ${schedule.id} executed successfully`)
            } else {
              console.error(`Report ${schedule.id} failed:`, result.error)
            }
          } catch (error) {
            console.error(`Error executing report ${schedule.id}:`, error)
          }
        },
        {
          scheduled: true,
          timezone: process.env.TZ || 'America/New_York'
        }
      )

      this.tasks.set(schedule.id, task)
      console.log(`Scheduled report ${schedule.id} with pattern: ${schedule.cronPattern}`)
    } catch (error) {
      console.error(`Error scheduling report ${schedule.id}:`, error)
    }
  }

  /**
   * Unschedule a report
   */
  static unscheduleReport(scheduleId: string) {
    const task = this.tasks.get(scheduleId)
    if (task) {
      task.stop()
      this.tasks.delete(scheduleId)
      console.log(`Unscheduled report ${scheduleId}`)
    }
  }

  /**
   * Update a schedule (reschedule if needed)
   */
  static async updateSchedule(scheduleId: string) {
    const schedule = await prisma.reportSchedule.findUnique({
      where: { id: scheduleId }
    })

    if (!schedule) {
      this.unscheduleReport(scheduleId)
      return
    }

    if (schedule.isActive && !schedule.isPaused) {
      this.scheduleReport(schedule)
    } else {
      this.unscheduleReport(scheduleId)
    }
  }

  /**
   * Start the retry checker for failed executions
   */
  static startRetryChecker() {
    // Run every 5 minutes
    this.retryInterval = setInterval(async () => {
      try {
        await this.checkAndRetryFailedExecutions()
      } catch (error) {
        console.error('Error in retry checker:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes
  }

  /**
   * Check for failed executions that should be retried
   */
  static async checkAndRetryFailedExecutions() {
    const now = new Date()
    
    // Find executions that are ready for retry
    const executionsToRetry = await prisma.reportExecutionHistory.findMany({
      where: {
        status: 'failed',
        retryAfter: {
          lte: now
        },
        attemptCount: {
          lt: 3 // Max retry attempts
        }
      },
      include: {
        schedule: true
      }
    })

    console.log(`Found ${executionsToRetry.length} executions ready for retry`)

    for (const execution of executionsToRetry) {
      // Skip if schedule is paused
      if (execution.schedule.isPaused) {
        continue
      }

      try {
        console.log(`Retrying execution ${execution.id} for schedule ${execution.scheduleId}`)
        await ReportExecutor.retryFailedExecution(execution.id)
      } catch (error) {
        console.error(`Error retrying execution ${execution.id}:`, error)
      }
    }
  }

  /**
   * Check for schedules that need their next run time calculated
   */
  static async updateNextRunTimes() {
    const schedules = await prisma.reportSchedule.findMany({
      where: {
        isActive: true,
        isPaused: false,
        nextRun: null
      }
    })

    for (const schedule of schedules) {
      try {
        const interval = cron.parseExpression(schedule.cronPattern)
        const nextRun = interval.next().toDate()
        
        await prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: { nextRun }
        })
      } catch (error) {
        console.error(`Error updating next run time for schedule ${schedule.id}:`, error)
      }
    }
  }

  /**
   * Cleanup old execution history (older than 90 days)
   */
  static async cleanupOldExecutions() {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)

    try {
      const result = await prisma.reportExecutionHistory.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          status: {
            in: ['completed', 'failed']
          }
        }
      })

      console.log(`Cleaned up ${result.count} old execution records`)
    } catch (error) {
      console.error('Error cleaning up old executions:', error)
    }
  }

  /**
   * Shutdown the scheduler
   */
  static shutdown() {
    console.log('Shutting down report scheduler...')
    
    // Stop all scheduled tasks
    for (const [scheduleId, task] of this.tasks) {
      task.stop()
    }
    this.tasks.clear()

    // Stop retry checker
    if (this.retryInterval) {
      clearInterval(this.retryInterval)
      this.retryInterval = null
    }

    console.log('Report scheduler shut down')
  }

  /**
   * Get scheduler status
   */
  static getStatus() {
    return {
      activeSchedules: this.tasks.size,
      scheduleIds: Array.from(this.tasks.keys()),
      retryCheckerActive: this.retryInterval !== null
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  ReportScheduler.shutdown()
})

process.on('SIGINT', () => {
  ReportScheduler.shutdown()
})