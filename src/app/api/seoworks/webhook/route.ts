import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  webhookPayloadSchema, 
  validateApiKey, 
  formatWebhookResponse,
  findTaskByExternalId,
  findMatchingOrder,
  extractEnhancedData
} from '@/lib/seoworks/utils';
import { z } from 'zod';

// GET endpoint for testing webhook connectivity
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.SEOWORKS_WEBHOOK_SECRET;
  
  if (!expectedKey) {
    console.error('[SEOWorks Webhook] SEOWORKS_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }
  
  if (!validateApiKey(apiKey, expectedKey)) {
    console.warn('[SEOWorks Webhook] Invalid API key attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
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
        pageTitle: 'Page or content title (optional)',
        contentUrl: 'https://example.com/content (optional)',
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
      pageTitle: 'Title of the page or content created',
      contentUrl: 'URL where the content can be accessed',
      taskCategory: 'Auto-mapped from taskType (e.g., Content Creation, Local SEO)'
    }
  });
}

// POST endpoint for receiving webhook data
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Validate API key
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.SEOWORKS_WEBHOOK_SECRET;
    
    if (!expectedKey) {
      console.error('[SEOWorks Webhook] SEOWORKS_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        formatWebhookResponse(false, 'Webhook not configured'),
        { status: 500 }
      );
    }
    
    if (!validateApiKey(apiKey, expectedKey)) {
      console.warn('[SEOWorks Webhook] Invalid API key attempt');
      return NextResponse.json(
        formatWebhookResponse(false, 'Unauthorized'),
        { status: 401 }
      );
    }
    
    // Parse and validate payload
    const body = await request.json();
    console.log('[SEOWorks Webhook] Received payload:', JSON.stringify(body, null, 2));
    
    let payload;
    try {
      payload = webhookPayloadSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[SEOWorks Webhook] Validation error:', error.errors);
        return NextResponse.json(
          formatWebhookResponse(false, 'Invalid payload format', error.errors),
          { status: 400 }
        );
      }
      throw error;
    }
    
    const { eventType, data } = payload;
    
    // Extract enhanced data with backward compatibility
    const enhancedData = extractEnhancedData(payload);
    console.log('[SEOWorks Webhook] Extracted enhanced data:', enhancedData);
    
    // Check if task already exists
    const existingTask = await findTaskByExternalId(prisma, data.externalId);
    
    if (existingTask) {
      console.log('[SEOWorks Webhook] Updating existing task:', data.externalId);
      
      // Update existing task
      const updatedTask = await prisma.seoWorksTask.update({
        where: { id: existingTask.id },
        data: {
          taskType: data.taskType,
          status: data.status,
          completionDate: data.completionDate ? new Date(data.completionDate) : null,
          postTitle: enhancedData.pageTitle || data.postTitle || '',
          postUrl: enhancedData.contentUrl || data.postUrl || null,
          completionNotes: data.completionNotes || null,
          payload: body,
          processedAt: new Date()
        }
      });
      
      // Update associated order if exists
      if (existingTask.orderId) {
        console.log('[SEOWorks Webhook] Updating associated order:', existingTask.orderId);
        
        await prisma.order.update({
          where: { id: existingTask.orderId },
          data: {
            status: mapOrderStatus(data.status),
            pageTitle: enhancedData.pageTitle,
            contentUrl: enhancedData.contentUrl,
            taskCategory: enhancedData.taskCategory,
            actualHours: data.actualHours,
            qualityScore: data.qualityScore,
            completionNotes: data.completionNotes,
            deliverables: data.deliverables || null,
            completedAt: data.status === 'completed' && data.completionDate 
              ? new Date(data.completionDate) 
              : null,
            updatedAt: new Date()
          }
        });
        
        // Log order update
        await logOrderUpdate(existingTask.orderId, eventType, data, enhancedData);
      }
      
      const responseTime = Date.now() - startTime;
      console.log(`[SEOWorks Webhook] Task updated successfully in ${responseTime}ms`);
      
      return NextResponse.json(
        formatWebhookResponse(true, 'Task updated successfully', {
          id: updatedTask.id,
          externalId: updatedTask.externalId,
          status: updatedTask.status,
          completedAt: updatedTask.completionDate
        })
      );
    } else {
      console.log('[SEOWorks Webhook] Creating new task:', data.externalId);
      
      // Find matching order
      const matchingOrder = await findMatchingOrder(prisma, data);
      
      // Create new task
      const newTask = await prisma.seoWorksTask.create({
        data: {
          externalId: data.externalId,
          taskType: data.taskType,
          status: data.status,
          completionDate: data.completionDate ? new Date(data.completionDate) : null,
          postTitle: enhancedData.pageTitle || data.postTitle || '',
          postUrl: enhancedData.contentUrl || data.postUrl || null,
          completionNotes: data.completionNotes || null,
          isWeekly: false, // Can be determined from task type or payload
          payload: body,
          orderId: matchingOrder?.id || null,
          agencyId: matchingOrder?.agencyId || null,
          receivedAt: new Date(),
          processedAt: new Date()
        }
      });
      
      // Update order if matched
      if (matchingOrder) {
        console.log('[SEOWorks Webhook] Updating matched order:', matchingOrder.id);
        
        await prisma.order.update({
          where: { id: matchingOrder.id },
          data: {
            status: mapOrderStatus(data.status),
            pageTitle: enhancedData.pageTitle,
            contentUrl: enhancedData.contentUrl,
            taskCategory: enhancedData.taskCategory,
            actualHours: data.actualHours,
            qualityScore: data.qualityScore,
            completionNotes: data.completionNotes,
            deliverables: data.deliverables || null,
            completedAt: data.status === 'completed' && data.completionDate 
              ? new Date(data.completionDate) 
              : null,
            updatedAt: new Date()
          }
        });
        
        // Log order update
        await logOrderUpdate(matchingOrder.id, eventType, data, enhancedData);
      }
      
      const responseTime = Date.now() - startTime;
      console.log(`[SEOWorks Webhook] Task created successfully in ${responseTime}ms`);
      
      return NextResponse.json(
        formatWebhookResponse(true, 'Task created successfully', {
          id: newTask.id,
          externalId: newTask.externalId,
          status: newTask.status,
          completedAt: newTask.completionDate
        }),
        { status: 201 }
      );
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[SEOWorks Webhook] Error processing webhook in ${responseTime}ms:`, error);
    
    return NextResponse.json(
      formatWebhookResponse(false, 'Internal server error', 
        error instanceof Error ? error.message : 'Unknown error'
      ),
      { status: 500 }
    );
  }
}

// Map SEOWorks status to Order status
function mapOrderStatus(seoWorksStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'in_progress': 'in_progress',
    'completed': 'completed',
    'cancelled': 'cancelled'
  };
  
  return statusMap[seoWorksStatus] || 'pending';
}

// Log order updates for audit trail
async function logOrderUpdate(
  orderId: string, 
  eventType: string, 
  taskData: { externalId: string; status: string },
  enhancedData: { pageTitle?: string; contentUrl?: string; taskCategory: string }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true }
    });
    
    if (order?.userId) {
      await prisma.auditLog.create({
        data: {
          action: `WEBHOOK_${eventType.toUpperCase()}`,
          entityType: 'order',
          entityId: orderId,
          userId: order.userId,
          userEmail: 'system@seoworks.webhook',
          details: {
            eventType,
            externalId: taskData.externalId,
            status: taskData.status,
            enhancedData,
            timestamp: new Date().toISOString()
          }
        }
      });
    }
  } catch (error) {
    console.error('[SEOWorks Webhook] Failed to create audit log:', error);
    // Don't throw - audit logging failure shouldn't break the webhook
  }
}