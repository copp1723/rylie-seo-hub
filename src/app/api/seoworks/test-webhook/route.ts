import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get the webhook data from the test request
    const testData = await request.json()
    
    // Wrap it in the expected webhook format
    const webhookPayload = {
      eventType: 'task.completed',
      timestamp: new Date().toISOString(),
      data: {
        externalId: testData.externalId || `test-${Date.now()}`,
        taskType: testData.taskType || 'blog',
        status: 'completed',
        completionDate: new Date().toISOString(),
        completionNotes: testData.completionNotes || 'Test completion',
        deliverables: testData.deliverables || [],
        actualHours: testData.actualHours,
        qualityScore: testData.qualityScore,
        assignedTo: testData.assignedTo || 'test@example.com'
      }
    }
    
    // Forward to the actual webhook endpoint
    const webhookUrl = new URL('/api/seoworks/webhook', request.url)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-api-key'
      },
      body: JSON.stringify(webhookPayload)
    })
    
    const result = await response.json()
    
    return NextResponse.json({
      testPayload: webhookPayload,
      webhookResponse: result,
      status: response.status
    })
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process test webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}