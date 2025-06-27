import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { Prisma } from '@prisma/client'
import { mapTaskTypeToCategory, extractDeliverableData } from '@/lib/seoworks/utils'

// Validation schema for incoming webhook data
const WebhookPayloadSchema = z.object({
  eventType: z.enum(['task.created', 'task.updated', 'task.completed', 'task.cancelled']),
  timestamp: z.string().datetime(),
  data: z.object({
    externalId: z.string(),
    taskType: z.enum(['blog', 'page', 'gbp', 'maintenance', 'seo', 'seo_audit']),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
    assignedTo: z.string().optional(),
    completionDate: z.string().datetime().optional(),
    deliverables: z.array(z.object({
      type: z.string(),
      url: z.string().url(),
      title: z.string(),
      description: z.string().optional(),
    })).optional(),
    completionNotes: z.string().optional(),
    actualHours: z.number().optional(),
    qualityScore: z.number().min(1).max(5).optional(),
  }),
})

// Verify API key
function verifyApiKey(providedKey: string | null, expectedKey: string): boolean {
  if (!providedKey || !expectedKey) {
    return false
  }
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(providedKey),
    Buffer.from(expectedKey)
  )
}

export async function POST(req: NextRequest) {
  try {
    // Check if mock mode is enabled (when no API key is configured)
    const isMockMode = !process.env.SEOWORKS_API_KEY || process.env.SEOWORKS_MOCK_MODE === 'true'
    
    // Get raw body for signature verification
    const rawBody = await req.text()
    const body = JSON.parse(rawBody)
    
    // Verify API key authentication
    const apiKey = req.headers.get('x-api-key')
    const expectedKey = process.env.SEOWORKS_WEBHOOK_SECRET || process.env.SEOWORKS_API_KEY || ''
    
    if (!isMockMode) {
      // Production mode: verify API key
      if (!apiKey || !expectedKey) {
        return NextResponse.json(
          { error: 'Unauthorized', details: 'Missing API key or webhook secret' },
          { status: 401 }
        )
      }
      
      if (!verifyApiKey(apiKey, expectedKey)) {
        return NextResponse.json(
          { error: 'Unauthorized', details: 'Invalid API key' },
          { status: 401 }
        )
      }
    } else {
      // Mock mode: accept test key or configured key
      if (apiKey !== 'test-api-key' && apiKey !== expectedKey) {
        console.log('Mock mode: Using test authentication')
      }
    }

    // Parse and validate request body
    const validationResult = WebhookPayloadSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validationResult.error.format(),
        },
        { status: 400 }
      )
    }

    const { eventType, data: taskData } = validationResult.data

    // Extract enhanced data from deliverables
    const { pageTitle, contentUrl, allDeliverables } = extractDeliverableData(taskData)
    const taskCategory = mapTaskTypeToCategory(taskData.taskType)

    // Log webhook processing details
    console.log('Webhook received:', {
      eventType,
      externalId: taskData.externalId,
      taskType: taskData.taskType,
      hasDeliverables: !!taskData.deliverables,
      deliverableCount: taskData.deliverables?.length || 0
    })

    // Log extracted data
    console.log('Extracted data:', {
      pageTitle,
      contentUrl,
      taskCategory
    })

    // Check if this task already exists
    const existingTask = await prisma.sEOWorksTask.findUnique({
      where: { externalId: taskData.externalId },
      include: { order: true },
    })

    if (existingTask) {
      // Update existing task
      const updatedTask = await prisma.sEOWorksTask.update({
        where: { id: existingTask.id },
        data: {
          taskType: taskData.taskType,
          status: taskData.status,
          completionDate: taskData.completionDate ? new Date(taskData.completionDate) : null,
          completionNotes: taskData.completionNotes,
          payload: {
            assignedTo: taskData.assignedTo,
            deliverables: taskData.deliverables,
            actualHours: taskData.actualHours,
            qualityScore: taskData.qualityScore,
          } as Prisma.InputJsonValue,
          processedAt: new Date(),
        },
      })

      // Update associated order if exists
      if (existingTask.order) {
        await prisma.order.update({
          where: { id: existingTask.order.id },
          data: {
            status: taskData.status,
            completionNotes: taskData.completionNotes,
            completedAt: taskData.status === 'completed' && taskData.completionDate 
              ? new Date(taskData.completionDate) 
              : null,
            pageTitle,
            contentUrl,
            taskCategory,
            actualHours: taskData.actualHours,
            qualityScore: taskData.qualityScore,
            deliverables: taskData.deliverables
              ? {
                  ...((existingTask.order.deliverables as object) || {}),
                  seoworks: {
                    deliverables: taskData.deliverables,
                    actualHours: taskData.actualHours,
                    qualityScore: taskData.qualityScore,
                  },
                } as Prisma.InputJsonValue
              : (existingTask.order.deliverables as Prisma.InputJsonValue),
          },
        })
      }

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'SEOWORKS_WEBHOOK_RECEIVED',
          entityType: 'seoworks_task',
          entityId: updatedTask.id,
          userEmail: 'seoworks-webhook@system',
          details: {
            eventType,
            externalId: taskData.externalId,
            status: taskData.status,
            hasOrder: !!existingTask.order,
            isMockMode,
            extractedData: {
              pageTitle,
              contentUrl,
              taskCategory,
              deliverableCount: allDeliverables.length,
            },
          },
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Task updated successfully',
        task: {
          id: updatedTask.id,
          externalId: taskData.externalId,
          status: updatedTask.status,
          completedAt: updatedTask.completionDate,
          orderId: existingTask.orderId,
        },
      })
    } else {
      // Create new task for task.created events
      if (eventType !== 'task.created') {
        return NextResponse.json(
          {
            error: 'Task not found',
            details: `No task found with externalId: ${taskData.externalId}`,
          },
          { status: 404 }
        )
      }

      const newTask = await prisma.sEOWorksTask.create({
        data: {
          externalId: taskData.externalId,
          taskType: taskData.taskType,
          status: taskData.status,
          completionDate: taskData.completionDate ? new Date(taskData.completionDate) : null,
          postTitle: pageTitle || `${taskData.taskType} Task - ${taskData.externalId}`,
          postUrl: contentUrl || '',
          completionNotes: taskData.completionNotes,
          isWeekly: false,
          payload: {
            assignedTo: taskData.assignedTo,
            deliverables: taskData.deliverables,
            actualHours: taskData.actualHours,
            qualityScore: taskData.qualityScore,
          } as Prisma.InputJsonValue,
          processedAt: new Date(),
        },
      })

      // Try to match with existing order
      const matchingOrder = await prisma.order.findFirst({
        where: {
          seoworksTaskId: taskData.externalId,
        },
      })

      if (matchingOrder) {
        // Link task to order and update order with enhanced data
        await prisma.sEOWorksTask.update({
          where: { id: newTask.id },
          data: { orderId: matchingOrder.id },
        })

        // Update order with extracted data
        await prisma.order.update({
          where: { id: matchingOrder.id },
          data: {
            status: taskData.status,
            pageTitle,
            contentUrl,
            taskCategory,
            actualHours: taskData.actualHours,
            qualityScore: taskData.qualityScore,
            deliverables: allDeliverables.length > 0
              ? allDeliverables as Prisma.InputJsonValue
              : undefined,
          },
        })
      }

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'SEOWORKS_WEBHOOK_RECEIVED',
          entityType: 'seoworks_task',
          entityId: newTask.id,
          userEmail: 'seoworks-webhook@system',
          details: {
            eventType,
            externalId: taskData.externalId,
            taskType: taskData.taskType,
            status: taskData.status,
            matchedOrder: !!matchingOrder,
            isMockMode,
            extractedData: {
              pageTitle,
              contentUrl,
              taskCategory,
              deliverableCount: allDeliverables.length,
            },
          },
        },
      })

      return NextResponse.json(
        {
          success: true,
          message: 'Task created successfully',
          task: {
            id: newTask.id,
            externalId: taskData.externalId,
            status: newTask.status,
            matchedOrder: !!matchingOrder,
          },
        },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error('Webhook processing error:', error)

    // Log error to audit log
    await prisma.auditLog
      .create({
        data: {
          action: 'WEBHOOK_ERROR',
          entityType: 'webhook',
          entityId: 'seoworks',
          userEmail: 'seoworks-webhook@system',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        },
      })
      .catch(console.error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint for testing webhook connectivity
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.SEOWORKS_WEBHOOK_SECRET || process.env.SEOWORKS_API_KEY || ''
  
  if (!expectedKey) {
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }
  
  if (!verifyApiKey(apiKey, expectedKey)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/seoworks/webhook',
    acceptedMethods: ['GET', 'POST'],
    expectedFormat: {
      eventType: 'task.completed',
      timestamp: '2024-03-15T10:30:00Z',
      data: {
        externalId: 'task-123',
        taskType: 'blog | page | gbp | maintenance | seo | seo_audit',
        status: 'pending | in_progress | completed | cancelled',
        completionDate: '2024-03-15T10:30:00Z (optional)',
        completionNotes: 'Notes about completion (optional)',
        deliverables: [
          {
            type: 'blog_post',
            url: 'https://example.com/blog/post',
            title: 'Post Title',
            description: 'Post description'
          }
        ],
        actualHours: 5,
        qualityScore: 5
      }
    },
    enhancedFields: {
      pageTitle: 'Extracted from first deliverable title',
      contentUrl: 'Extracted from first deliverable URL',
      taskCategory: 'Auto-mapped from taskType (e.g., Content Creation, Local SEO)'
    }
  })
}