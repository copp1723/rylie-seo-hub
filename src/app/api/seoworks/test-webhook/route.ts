import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to simulate webhook calls
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Build test payload with enhanced fields
    const testPayload = {
      eventType: body.eventType || 'task.completed',
      timestamp: new Date().toISOString(),
      data: {
        externalId: body.externalId || `test-${Date.now()}`,
        taskType: body.taskType || 'blog',
        status: body.status || 'completed',
        
        // Enhanced fields
        pageTitle: body.pageTitle || body.postTitle || 'Test Blog Post: SEO Best Practices 2024',
        contentUrl: body.contentUrl || body.postUrl || 'https://example.com/blog/seo-best-practices-2024',
        
        // Standard fields
        completionDate: body.completionDate || new Date().toISOString(),
        completionNotes: body.completionNotes || 'Test task completed successfully with enhanced data',
        deliverables: body.deliverables || [
          {
            type: 'blog_post',
            url: body.contentUrl || 'https://example.com/blog/seo-best-practices-2024',
            title: body.pageTitle || 'SEO Best Practices 2024',
            description: 'Comprehensive guide covering modern SEO techniques'
          }
        ],
        actualHours: body.actualHours || 4.5,
        qualityScore: body.qualityScore || 5,
        
        // Backward compatibility fields
        postTitle: body.postTitle || body.pageTitle || 'Test Blog Post: SEO Best Practices 2024',
        postUrl: body.postUrl || body.contentUrl || 'https://example.com/blog/seo-best-practices-2024'
      }
    };
    
    // Make request to actual webhook endpoint
    const webhookUrl = new URL('/api/seoworks/webhook', request.url);
    const webhookResponse = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SEOWORKS_WEBHOOK_SECRET || 'test-key'
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await webhookResponse.json();
    
    return NextResponse.json({
      success: webhookResponse.ok,
      statusCode: webhookResponse.status,
      payload: testPayload,
      response: result,
      note: 'This is a test endpoint. Use the payload structure above for actual webhook calls.'
    }, { status: webhookResponse.status });
    
  } catch (error) {
    console.error('[Test Webhook] Error:', error);
    return NextResponse.json({
      error: 'Test webhook failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to show test payload examples
export async function GET() {
  return NextResponse.json({
    description: 'Test endpoint for SEOWorks webhook',
    usage: 'POST /api/seoworks/test-webhook',
    examples: {
      minimal: {
        externalId: 'task-123',
        taskType: 'blog',
        completionNotes: 'Blog post completed'
      },
      withEnhancedFields: {
        externalId: 'task-456',
        taskType: 'page',
        status: 'completed',
        pageTitle: '10 Essential SEO Tips for Local Businesses',
        contentUrl: 'https://example.com/seo-tips-local',
        completionNotes: 'Page created with all SEO optimizations',
        actualHours: 6,
        qualityScore: 5
      },
      backwardCompatible: {
        externalId: 'task-789',
        taskType: 'gbp',
        status: 'completed',
        postTitle: 'Google Business Profile Optimized',
        postUrl: 'https://google.com/maps/place/example-business',
        completionNotes: 'GBP fully optimized with photos and posts'
      }
    },
    supportedTaskTypes: ['blog', 'page', 'gbp', 'maintenance', 'seo', 'seo_audit'],
    supportedStatuses: ['pending', 'in_progress', 'completed', 'cancelled'],
    taskCategories: {
      blog: 'Content Creation',
      page: 'Content Creation',
      gbp: 'Local SEO',
      maintenance: 'Technical SEO',
      seo: 'Optimization',
      seo_audit: 'Analysis & Reporting'
    }
  });
}