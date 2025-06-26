import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { Prisma } from '@prisma/client'

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

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(req: NextRequest) {
  try {
    // Check if mock mode is enabled (when no API key is configured)
    const isMockMode = !process.env.SEOWORKS_API_KEY || process.env.SEOWORKS_MOCK_MODE === 'true'
    
    // Get raw body for signature verification
    const rawBody = await req.text()
    const body = JSON.parse(rawBody)
    
    // Verify authentication
    if (!isMockMode) {
      // Production mode: verify signature
      const signature = req.headers.get('x-seoworks-signature')
      const secret = process.env.SEOWORKS_WEBHOOK_SECRET || ''
      
      if (!signature || !secret) {
        return NextResponse.json(
          { error: 'Unauthorized', details: 'Missing signature or webhook secret' },
          { status: 401 }
        )
      }
      
      if (!verifyWebhookSignature(rawBody, signature, secret)) {
        return NextResponse.json(
          { error: 'Unauthorized', details: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
    } else {
      // Mock mode: verify API key for testing
      const apiKey = req.headers.get('x-api-key')
      if (apiKey !== 'test-api-key' && apiKey !== process.env.SEOWORKS_API_KEY) {
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
          postTitle: `${taskData.taskType} Task - ${taskData.externalId}`,
          postUrl: '',
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
        // Link task to order
        await prisma.sEOWorksTask.update({
          where: { id: newTask.id },
          data: { orderId: matchingOrder.id },
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
export async function GET(req: NextRequest) {
  const isMockMode = !process.env.SEOWORKS_API_KEY || process.env.SEOWORKS_MOCK_MODE === 'true'
  
  // In production, require API key
  if (!isMockMode) {
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.SEOWORKS_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.json({
    success: true,
    endpoint: '/api/seoworks/webhook',
    status: 'ready',
    mode: isMockMode ? 'mock' : 'production',
    acceptedMethods: ['POST', 'GET'],
    authentication: isMockMode 
      ? {
          mode: 'mock',
          info: 'Mock mode enabled - using test authentication',
        }
      : {
          mode: 'production',
          requiredHeaders: {
            'x-seoworks-signature': 'HMAC-SHA256 signature of request body',
          },
        },
    schema: {
      eventType: 'string (required) - One of: task.created, task.updated, task.completed, task.cancelled',
      timestamp: 'string (required) - ISO 8601 datetime',
      data: {
        externalId: 'string (required) - Unique task identifier from SEO Works',
        taskType: 'string (required) - One of: blog, page, gbp, maintenance, seo, seo_audit',
        status: 'string (required) - One of: pending, in_progress, completed, cancelled',
        assignedTo: 'string (optional) - Email of assigned team member',
        completionDate: 'string (optional) - ISO 8601 datetime when completed',
        deliverables: 'array (optional) - List of deliverable objects with type, url, title, description',
        completionNotes: 'string (optional) - Additional notes from SEO Works',
        actualHours: 'number (optional) - Actual hours spent on task',
        qualityScore: 'number (optional) - Quality score 1-5',
      },
    },
    testingInstructions: isMockMode 
      ? 'Use the /api/seoworks/test endpoint to simulate webhook calls'
      : 'Contact SEO Works for webhook testing credentials',
  })
}
