import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { queueOrderForSEOWorks } from '@/lib/seoworks/queue'
import { logger } from '@/lib/observability'

export async function GET() { // Removed unused _request parameter
  try {
    // Auth disabled - using default values
    const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@example.com'
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    // Get all orders for this user
    const orders = await prisma.order.findMany({
      where: {
        userEmail: userEmail,
        agencyId: agencyId,
      },
fix/typescript-errors
      // include: { // TODO:AGENT2_PRISMA - Define OrderMessage model and relation
      //   messages: {
      //     select: {
      //       id: true,
      //       content: true,
      //       type: true,
      //       createdAt: true
      //     },
      //     orderBy: {
      //       createdAt: 'desc'
      //     }
      //   }
      // },
=======
      include: {
        messages: {
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
 main
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        id: order.id,
        taskType: order.taskType,
        title: order.title,
        description: order.description,
        status: order.status,
        // priority: order.priority, // TODO:AGENT2_PRISMA - Add priority to Order model
        requestedAt: order.createdAt,
        completedAt: order.completedAt,
        assignedTo: order.assignedTo,
        estimatedHours: order.estimatedHours,
        actualHours: order.actualHours,
        deliverables: order.deliverables ? JSON.parse(order.deliverables as string) : [],
        completionNotes: order.completionNotes,
        qualityScore: order.qualityScore,
        seoworksTaskId: order.seoworksTaskId,
 fix/typescript-errors
        // messages: order.messages, // TODO:AGENT2_PRISMA - Define OrderMessage model and relation
        // keywords: order.keywords ? JSON.parse(order.keywords as string) : [], // TODO:AGENT2_PRISMA - Add keywords to Order model
        // targetUrl: order.targetUrl, // TODO:AGENT2_PRISMA - Add targetUrl to Order model
        // wordCount: order.wordCount // TODO:AGENT2_PRISMA - Add wordCount to Order model
      }))
=======
        messages: order.messages,
        keywords: order.keywords ? JSON.parse(order.keywords as string) : [],
        targetUrl: order.targetUrl,
        wordCount: order.wordCount,
      })), main
    })
  } catch (error) {
    logger.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth disabled - using default values
    // const userId = process.env.DEFAULT_USER_ID || 'test-user-id' // Unused
    const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@example.com'
    const agencyId = process.env.DEFAULT_AGENCY_ID || 'default-agency'

    const body = await request.json()
    const {
      taskType,
      title,
      description,
      estimatedHours,
 fix/typescript-errors
      // priority = 'medium', // TODO:AGENT2_PRISMA - Add priority to Order model
      // keywords = [], // TODO:AGENT2_PRISMA - Add keywords to Order model
      // targetUrl, // TODO:AGENT2_PRISMA - Add targetUrl to Order model
      // wordCount // TODO:AGENT2_PRISMA - Add wordCount to Order model
=======
      priority = 'medium',
      keywords = [],
      targetUrl,
      wordCount,
 main
    } = body

    // Validate required fields
    if (!taskType || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: taskType, title, description' },
        { status: 400 }
      )
    }

    // Create new order
    const order = await prisma.order.create({
      data: {
        taskType,
        title,
        description,
        status: 'pending',
        // priority, // TODO:AGENT2_PRISMA
        userEmail: userEmail, // Prisma should automatically connect the relation based on this
        agencyId: agencyId,
        estimatedHours: estimatedHours || null,
 fix/typescript-errors
        // keywords: keywords.length > 0 ? JSON.stringify(keywords) : null, // TODO:AGENT2_PRISMA
        // targetUrl: targetUrl || null, // TODO:AGENT2_PRISMA
        // wordCount: wordCount || null // TODO:AGENT2_PRISMA
      }
=======
        keywords: keywords.length > 0 ? JSON.stringify(keywords) : null,
        targetUrl: targetUrl || null,
        wordCount: wordCount || null,
      },
 main
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ORDER_CREATED',
        entityType: 'order',
        entityId: order.id,
        userEmail: userEmail, // Prisma should automatically connect the relation based on this
        details: {
          taskType,
          title,
 fix/typescript-errors
          // priority // TODO:AGENT2_PRISMA
        }
      }
=======
          priority,
        },
      },
 main
    })

    // Queue order for SEO Works processing
    try {
      await queueOrderForSEOWorks(order.id)
      logger.info('Order queued for SEO Works', { orderId: order.id })

      // Add initial message
 fix/typescript-errors
      // TODO:AGENT2_PRISMA - Define OrderMessage model and relation
      // await prisma.orderMessage.create({
      //   data: {
      //     orderId: order.id,
      //     agencyId: agencyId,
      //     userId: userId, // This would also need to be user: { connect: ... }
      //     type: 'status_update',
      //     content: 'Your request has been submitted and will be processed shortly.'
      //   }
      // })
=======
      await prisma.orderMessage.create({
        data: {
          orderId: order.id,
          agencyId: agencyId,
          userId: userId,
          type: 'status_update',
          content: 'Your request has been submitted and will be processed shortly.',
        },
      })
main
    } catch (queueError) {
      logger.error('Failed to queue order for SEO Works', {
        orderId: order.id,
        error: queueError,
      })
      // Don't fail the request - order is created, just not sent yet

      // Add error message
fix/typescript-errors
      // TODO:AGENT2_PRISMA - Define OrderMessage model and relation
      // await prisma.orderMessage.create({
      //   data: {
      //     orderId: order.id,
      //     agencyId: agencyId,
      //     userId: userId, // This would also need to be user: { connect: ... }
      //     type: 'status_update',
      //     content: 'Your request has been created. We will begin processing it shortly.'
      //   }
      // })
=======
      await prisma.orderMessage.create({
        data: {
          orderId: order.id,
          agencyId: agencyId,
          userId: userId,
          type: 'status_update',
          content: 'Your request has been created. We will begin processing it shortly.',
        },
      })
 main
    }

    logger.info('Order created successfully', {
      orderId: order.id,
      taskType,
 fix/typescript-errors
      // priority // TODO:AGENT2_PRISMA
=======
      priority,
 main
    })

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        taskType: order.taskType,
        title: order.title,
        description: order.description,
        status: order.status,
        // priority: order.priority, // TODO:AGENT2_PRISMA
        requestedAt: order.createdAt,
        estimatedHours: order.estimatedHours,
fix/typescript-errors
        // keywords: keywords, // TODO:AGENT2_PRISMA
        // targetUrl: targetUrl, // TODO:AGENT2_PRISMA
        // wordCount: wordCount // TODO:AGENT2_PRISMA
      }
=======
        keywords: keywords,
        targetUrl: order.targetUrl,
        wordCount: order.wordCount,
      },
 main
    })
  } catch (error) {
    logger.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
