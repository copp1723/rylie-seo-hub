import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for incoming webhook data
const WebhookTaskSchema = z.object({
  id: z.string(),
  task_type: z.enum(['blog', 'page', 'gbp', 'maintenance', 'seo', 'seo_audit']),
  status: z.enum(['completed', 'pending', 'in_progress', 'cancelled']),
  completion_date: z.string().datetime(),
  post_title: z.string(),
  post_url: z.string().url().optional(),
  completion_notes: z.string().optional(),
  is_weekly: z.boolean().optional().default(false),
  payload: z.record(z.any()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.SEOWORKS_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Invalid or missing API key' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validationResult = WebhookTaskSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validationResult.error.format(),
        },
        { status: 400 }
      )
    }

    const taskData = validationResult.data

    // Check if this task already exists
    const existingTask = await prisma.sEOWorksTask.findUnique({
      where: { externalId: taskData.id },
      include: { order: true },
    })

    if (existingTask) {
      // Update existing task
      const updatedTask = await prisma.sEOWorksTask.update({
        where: { id: existingTask.id },
        data: {
          taskType: taskData.task_type,
          status: taskData.status,
          completionDate:
            taskData.status === 'completed' ? new Date(taskData.completion_date) : null,
          postTitle: taskData.post_title,
          postUrl: taskData.post_url,
          completionNotes: taskData.completion_notes,
          isWeekly: taskData.is_weekly,
          payload: taskData.payload,
          processedAt: new Date(),
        },
      })

      // Update associated order if exists
      if (existingTask.order) {
        await prisma.order.update({
          where: { id: existingTask.order.id },
          data: {
            status: taskData.status,
            completionNotes: taskData.completion_notes,
            completedAt:
              taskData.status === 'completed' ? new Date(taskData.completion_date) : null,
            deliverables: taskData.payload
              ? JSON.parse(
                  JSON.stringify({
                    ...((existingTask.order.deliverables as object) || {}),
                    postUrl: taskData.post_url,
                    postTitle: taskData.post_title,
                    ...taskData.payload,
                  })
                )
              : existingTask.order.deliverables,
          },
        })
      }

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'SEOWORKS_TASK_UPDATED',
          entityType: 'seoworks_task',
          entityId: updatedTask.id,
          userEmail: 'seoworks-api@system',
          details: {
            externalId: taskData.id,
            status: taskData.status,
            isWeekly: taskData.is_weekly,
            hasOrder: !!existingTask.order,
          },
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Task updated successfully',
        task: {
          id: updatedTask.id,
          externalId: taskData.id,
          status: updatedTask.status,
          completedAt: updatedTask.completionDate,
          orderId: existingTask.orderId,
        },
      })
    } else {
      // Create new task
      const newTask = await prisma.sEOWorksTask.create({
        data: {
          externalId: taskData.id,
          taskType: taskData.task_type,
          status: taskData.status,
          completionDate:
            taskData.status === 'completed' ? new Date(taskData.completion_date) : null,
          postTitle: taskData.post_title,
          postUrl: taskData.post_url || '',
          completionNotes: taskData.completion_notes,
          isWeekly: taskData.is_weekly,
          payload: taskData.payload,
          processedAt: new Date(),
        },
      })

      // Try to match with existing order by task details
      const matchingOrder = await prisma.order.findFirst({
        where: {
          taskType: taskData.task_type,
          title: { contains: taskData.post_title.slice(0, 20) },
          seoworksTaskId: null,
        },
      })

      if (matchingOrder) {
        // Link task to order
        await prisma.sEOWorksTask.update({
          where: { id: newTask.id },
          data: { orderId: matchingOrder.id },
        })

        await prisma.order.update({
          where: { id: matchingOrder.id },
          data: { seoworksTaskId: taskData.id },
        })
      }

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'SEOWORKS_TASK_CREATED',
          entityType: 'seoworks_task',
          entityId: newTask.id,
          userEmail: 'seoworks-api@system',
          details: {
            externalId: taskData.id,
            taskType: taskData.task_type,
            status: taskData.status,
            isWeekly: taskData.is_weekly,
            matchedOrder: !!matchingOrder,
          },
        },
      })

      return NextResponse.json(
        {
          success: true,
          message: 'Task created successfully',
          task: {
            id: newTask.id,
            externalId: taskData.id,
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
          entityId: 'unknown',
          userEmail: 'seoworks-api@system',
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
  const apiKey = req.headers.get('x-api-key')

  if (!apiKey || apiKey !== process.env.SEOWORKS_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    endpoint: '/api/seoworks/webhook',
    status: 'ready',
    acceptedMethods: ['POST', 'GET'],
    requiredHeaders: {
      'x-api-key': 'Required - Your SEOWerks API key',
      'content-type': 'application/json',
    },
    schema: {
      id: 'string (required) - Unique task identifier',
      task_type: 'string (required) - One of: blog, page, gbp, maintenance, seo, seo_audit',
      status: 'string (required) - One of: completed, pending, in_progress, cancelled',
      completion_date: 'string (required) - ISO 8601 datetime',
      post_title: 'string (required) - Title of the content',
      post_url: 'string (optional) - URL to the live content',
      completion_notes: 'string (optional) - Additional notes',
      is_weekly: 'boolean (optional) - Whether this is a weekly rollup',
      payload: 'object (optional) - Additional data',
    },
  })
}
