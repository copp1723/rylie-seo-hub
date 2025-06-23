import { prisma } from '@/lib/prisma'

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
      task_id: order.id,
      task_type: taskType,
      title: order.title,
      description: order.description,
      priority: assignmentRules.priority,
      estimated_hours: order.estimatedHours || assignmentRules.defaultHours,
      dealership_id: order.agencyId,
      dealership_name: order.agency.name,
      package: onboarding.package,
      created_at: order.createdAt.toISOString(),
      metadata: {
        agency_slug: order.agency.slug,
        user_email: order.userEmail,
        onboarding_id: onboarding.id,
      },
    }

    // Submit to SEO WORKS API
    const seoworksResponse = await submitTaskToSEOWorks(seoworksPayload)

    if (seoworksResponse.success) {
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
          details: JSON.stringify({
            seoworksTaskId: seoworksResponse.taskId,
            assignedTo: seoworksResponse.assignedTo,
            priority: assignmentRules.priority,
          }),
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
        details: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
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
      maintenance: { priority: 'medium', defaultHours: 2, turnaround: '1-2 days' },
    },
    GOLD: {
      blog: { priority: 'medium', defaultHours: 3, turnaround: '3-5 days' },
      page: { priority: 'medium', defaultHours: 5, turnaround: '5-7 days' },
      gbp: { priority: 'high', defaultHours: 2, turnaround: '2-3 days' },
      seo: { priority: 'medium', defaultHours: 6, turnaround: '7-10 days' },
      maintenance: { priority: 'low', defaultHours: 1, turnaround: '2-3 days' },
    },
    SILVER: {
      blog: { priority: 'low', defaultHours: 2, turnaround: '5-7 days' },
      page: { priority: 'low', defaultHours: 4, turnaround: '7-10 days' },
      gbp: { priority: 'medium', defaultHours: 1, turnaround: '3-5 days' },
      seo: { priority: 'low', defaultHours: 4, turnaround: '10-14 days' },
      maintenance: { priority: 'low', defaultHours: 1, turnaround: '3-5 days' },
    },
  }

  return rules[packageType]?.[taskType] || { 
    priority: 'medium', 
    defaultHours: 3, 
    turnaround: '5-7 days' 
  }
}

// Submit task to SEO WORKS API
async function submitTaskToSEOWorks(payload: any): Promise<{
  success: boolean
  taskId?: string
  assignedTo?: string
  error?: string
}> {
  try {
    // TODO: Replace with actual SEO WORKS API call
    // const response = await fetch('https://api.seowerks.ai/tasks', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.SEOWORKS_API_KEY}`,
    //   },
    //   body: JSON.stringify(payload),
    // })

    // For now, simulate successful assignment
    const mockResponse = {
      success: true,
      taskId: `seoworks_${Date.now()}`,
      assignedTo: 'SEO WORKS Team',
    }

    console.log('Mock SEO WORKS task submission:', payload)
    console.log('Mock SEO WORKS response:', mockResponse)

    return mockResponse

  } catch (error) {
    console.error('SEO WORKS API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Get task status from SEO WORKS
export async function getTaskStatus(seoworksTaskId: string) {
  try {
    // TODO: Replace with actual SEO WORKS API call
    // const response = await fetch(`https://api.seowerks.ai/tasks/${seoworksTaskId}`, {
    //   headers: {
    //     'Authorization': `Bearer ${process.env.SEOWORKS_API_KEY}`,
    //   },
    // })

    // For now, return mock status
    return {
      success: true,
      status: 'in_progress',
      progress: 75,
      estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }

  } catch (error) {
    console.error('SEO WORKS status check error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

