import { prisma } from '@/lib/prisma'
import { seoWorksClient, SEOWorksClient } from '@/lib/seoworks'

// Task assignment logic based on package and task type
export async function assignTaskToSEOWorks(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        agency: true,
      },
    })

    if (!order || !order.agency) {
      throw new Error('Order or agency not found')
    }

    // Get the most recent onboarding for this agency to determine package
    const onboarding = await prisma.dealershipOnboarding.findFirst({
      where: { agencyId: order.agencyId! },
      orderBy: { createdAt: 'desc' },
    })

    if (!onboarding) {
      throw new Error('No onboarding found for agency')
    }

    // Determine priority and assignment based on package and task type
    const taskType = order.taskType || 'general' // Provide default if null
    const assignmentRules = getAssignmentRules(onboarding.package, taskType)

    // Create SEO WORKS task payload
    const seoworksPayload = {
      id: order.id,
      taskType: taskType as any,
      title: order.title,
      description: order.description || '',
      priority: assignmentRules.priority as 'low' | 'medium' | 'high',
      estimatedHours: order.estimatedHours || assignmentRules.defaultHours,
      dealershipId: order.agencyId!,
      dealershipName: order.agency.name,
      package: onboarding.package,
      metadata: {
        createdAt: order.createdAt.toISOString(),
        agencySlug: order.agency.slug,
        userEmail: order.userEmail,
        onboardingId: onboarding.id,
        turnaround: assignmentRules.turnaround,
      },
    }

    // Submit to SEO WORKS API using the client
    const seoworksResponse = await seoWorksClient.createTask(seoworksPayload)

    if (seoworksResponse.success && seoworksResponse.taskId) {
      // Update order with SEO WORKS task ID
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'in_progress',
          assignedTo: seoworksResponse.assignedTo || 'SEO WORKS Team',
          seoworksTaskId: seoworksResponse.taskId,
        },
      })

      // Log the assignment
      await prisma.auditLog.create({
        data: {
          action: 'TASK_ASSIGNED_TO_SEOWORKS',
          entityType: 'order',
          entityId: orderId,
          userEmail: 'system',
          details: {
            seoworksTaskId: seoworksResponse.taskId,
            assignedTo: seoworksResponse.assignedTo,
            priority: assignmentRules.priority,
            estimatedHours: seoworksPayload.estimatedHours,
            turnaround: assignmentRules.turnaround,
            isMockMode: seoWorksClient.isMockMode(),
          },
        },
      })

      return { success: true, seoworksTaskId: seoworksResponse.taskId }
    } else {
      throw new Error(`SEO WORKS assignment failed: ${seoworksResponse.error}`)
    }
  } catch (error) {
    console.error('Task assignment error:', error)

    // Log the failure
    await prisma.auditLog.create({
      data: {
        action: 'TASK_ASSIGNMENT_FAILED',
        entityType: 'order',
        entityId: orderId,
        userEmail: 'system',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          isMockMode: seoWorksClient.isMockMode(),
        },
      },
    })

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Assignment rules based on package and task type
function getAssignmentRules(packageType: string, taskType: string) {
  const rules: Record<string, Record<string, any>> = {
    PLATINUM: {
      blog: { priority: 'high', defaultHours: 4, turnaround: '2-3 days' },
      page: { priority: 'high', defaultHours: 6, turnaround: '3-5 days' },
      gbp: { priority: 'high', defaultHours: 2, turnaround: '1-2 days' },
      seo: { priority: 'high', defaultHours: 8, turnaround: '5-7 days' },
      seo_audit: { priority: 'high', defaultHours: 10, turnaround: '7-10 days' },
      maintenance: { priority: 'medium', defaultHours: 2, turnaround: '1-2 days' },
      general: { priority: 'medium', defaultHours: 3, turnaround: '3-5 days' },
    },
    GOLD: {
      blog: { priority: 'medium', defaultHours: 3, turnaround: '3-5 days' },
      page: { priority: 'medium', defaultHours: 5, turnaround: '5-7 days' },
      gbp: { priority: 'high', defaultHours: 2, turnaround: '2-3 days' },
      seo: { priority: 'medium', defaultHours: 6, turnaround: '7-10 days' },
      seo_audit: { priority: 'medium', defaultHours: 8, turnaround: '10-14 days' },
      maintenance: { priority: 'low', defaultHours: 1, turnaround: '2-3 days' },
      general: { priority: 'low', defaultHours: 2, turnaround: '5-7 days' },
    },
    SILVER: {
      blog: { priority: 'low', defaultHours: 2, turnaround: '5-7 days' },
      page: { priority: 'low', defaultHours: 4, turnaround: '7-10 days' },
      gbp: { priority: 'medium', defaultHours: 1, turnaround: '3-5 days' },
      seo: { priority: 'low', defaultHours: 4, turnaround: '10-14 days' },
      seo_audit: { priority: 'low', defaultHours: 6, turnaround: '14-21 days' },
      maintenance: { priority: 'low', defaultHours: 1, turnaround: '3-5 days' },
      general: { priority: 'low', defaultHours: 1, turnaround: '7-10 days' },
    },
  }

  return (
    rules[packageType]?.[taskType] || {
      priority: 'medium',
      defaultHours: 3,
      turnaround: '5-7 days',
    }
  )
}

// Get task status from SEO WORKS
export async function getTaskStatus(seoworksTaskId: string) {
  try {
    const status = await seoWorksClient.getTaskStatus(seoworksTaskId)
    
    if (!status.success) {
      throw new Error(status.error || 'Failed to get task status')
    }

    // Update local task record if status changed
    const task = await prisma.sEOWorksTask.findUnique({
      where: { externalId: seoworksTaskId },
      include: { order: true },
    })

    if (task && task.status !== status.status) {
      await prisma.sEOWorksTask.update({
        where: { id: task.id },
        data: {
          status: status.status!,
          processedAt: new Date(),
        },
      })

      // Update order status if linked
      if (task.order) {
        await prisma.order.update({
          where: { id: task.order.id },
          data: {
            status: status.status!,
            assignedTo: status.assignedTo || task.order.assignedTo,
          },
        })
      }

      // Log status change
      await prisma.auditLog.create({
        data: {
          action: 'SEOWORKS_STATUS_UPDATED',
          entityType: 'seoworks_task',
          entityId: task.id,
          userEmail: 'system',
          details: {
            previousStatus: task.status,
            newStatus: status.status,
            progress: status.progress,
            estimatedCompletion: status.estimatedCompletion,
            isMockMode: seoWorksClient.isMockMode(),
          },
        },
      })
    }

    return {
      success: true,
      status: status.status,
      progress: status.progress,
      estimatedCompletion: status.estimatedCompletion,
      assignedTo: status.assignedTo,
      actualHours: status.actualHours,
    }
  } catch (error) {
    console.error('SEO WORKS status check error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Cancel a task in SEO WORKS
export async function cancelSEOWorksTask(seoworksTaskId: string, reason?: string) {
  try {
    const result = await seoWorksClient.cancelTask(seoworksTaskId, reason)
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to cancel task')
    }

    // Update local records
    const task = await prisma.sEOWorksTask.findUnique({
      where: { externalId: seoworksTaskId },
      include: { order: true },
    })

    if (task) {
      await prisma.sEOWorksTask.update({
        where: { id: task.id },
        data: {
          status: 'cancelled',
          completionNotes: reason,
          processedAt: new Date(),
        },
      })

      // Update order if linked
      if (task.order) {
        await prisma.order.update({
          where: { id: task.order.id },
          data: {
            status: 'cancelled',
            completionNotes: reason,
          },
        })
      }

      // Log cancellation
      await prisma.auditLog.create({
        data: {
          action: 'SEOWORKS_TASK_CANCELLED',
          entityType: 'seoworks_task',
          entityId: task.id,
          userEmail: 'system',
          details: {
            seoworksTaskId,
            reason,
            isMockMode: seoWorksClient.isMockMode(),
          },
        },
      })
    }

    return { success: true }
  } catch (error) {
    console.error('SEO WORKS cancellation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Export for use in other modules
export { SEOWorksClient, seoWorksClient }