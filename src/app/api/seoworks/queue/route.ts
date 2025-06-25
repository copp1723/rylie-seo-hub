import { NextRequest, NextResponse } from 'next/server'
import { getQueueStatus, processOrderQueue } from '@/lib/seoworks/queue'
import { logger } from '@/lib/observability'

export async function GET(request: NextRequest) {
  try {
    // Get queue status
    const status = getQueueStatus()
    
    return NextResponse.json({
      success: true,
      queue: status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error getting queue status:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Trigger queue processing manually
    // In production, this would typically be called by a cron job
    
    logger.info('Manual queue processing triggered')
    
    // Process queue in the background
    processOrderQueue().catch(error => {
      logger.error('Error in background queue processing:', error)
    })
    
    return NextResponse.json({
      success: true,
      message: 'Queue processing triggered'
    })
  } catch (error) {
    logger.error('Error triggering queue processing:', error)
    return NextResponse.json(
      { error: 'Failed to trigger queue processing' },
      { status: 500 }
    )
  }
}