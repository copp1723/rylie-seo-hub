import { NextRequest, NextResponse } from 'next/server'

// Test endpoint to simulate SEOWorks webhook for task completion
export async function POST(req: NextRequest) {
  try {
    // Get the test parameters from the request
    const body = await req.json()
    const {
      externalId = 'test-task-' + Date.now(),
      taskType = 'blog',
      completionNotes = 'Test task completed successfully',
      deliverables = [
        {
          type: 'blog_post',
          url: 'https://example.com/test-blog-post',
          title: 'Test Blog Post',
          description: 'This is a test deliverable',
        },
      ],
      actualHours = 4.5,
      qualityScore = 5,
    } = body

    // Create the webhook payload
    const webhookPayload = {
      eventType: 'task.completed',
      timestamp: new Date().toISOString(),
      data: {
        externalId,
        taskType,
        status: 'completed',
        completionDate: new Date().toISOString(),
        completionNotes,
        deliverables,
        actualHours,
        qualityScore,
      },
    }

    // Get the webhook URL from environment or use local
    const webhookUrl = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/seoworks/webhook`
      : `http://localhost:${process.env.PORT || 3000}/api/seoworks/webhook`

    // Get the API key from environment
    const apiKey = process.env.SEOWORKS_WEBHOOK_SECRET || process.env.SEOWORKS_API_KEY || 'test-api-key'

    // Send the webhook request
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(webhookPayload),
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Webhook call failed',
          status: response.status,
          details: result,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test webhook sent successfully',
      webhookUrl,
      payload: webhookPayload,
      response: result,
    })
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send test webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint to show test webhook documentation
export async function GET(req: NextRequest) {
  const apiKey = process.env.SEOWORKS_WEBHOOK_SECRET || process.env.SEOWORKS_API_KEY || 'test-api-key'
  const webhookUrl = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/seoworks/webhook`
    : `http://localhost:${process.env.PORT || 3000}/api/seoworks/webhook`

  return NextResponse.json({
    endpoint: '/api/seoworks/test-webhook',
    description: 'Test endpoint to simulate SEOWorks task completion webhooks',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      externalId: '(optional) Unique task ID - defaults to test-task-{timestamp}',
      taskType: '(optional) Type of task - defaults to "blog"',
      completionNotes: '(optional) Notes about completion',
      deliverables: '(optional) Array of deliverable objects',
      actualHours: '(optional) Hours spent on task',
      qualityScore: '(optional) Quality score 1-5',
    },
    example: {
      curl: `curl -X POST ${webhookUrl.replace('webhook', 'test-webhook')} \\
  -H "Content-Type: application/json" \\
  -d '{
    "externalId": "task-123",
    "taskType": "blog",
    "completionNotes": "Blog post completed with SEO optimization",
    "deliverables": [{
      "type": "blog_post",
      "url": "https://example.com/new-blog-post",
      "title": "10 SEO Tips for 2024",
      "description": "Comprehensive guide on modern SEO"
    }],
    "actualHours": 6,
    "qualityScore": 5
  }'`,
    },
    webhookDetails: {
      url: webhookUrl,
      authentication: {
        header: 'x-api-key',
        value: apiKey === 'test-api-key' ? 'test-api-key (using test mode)' : '[configured in environment]',
      },
    },
  })
}