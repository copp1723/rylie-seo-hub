import { NextRequest, NextResponse } from 'next/server'

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Rylie SEO Hub - SEO Werks API',
    version: '1.0.0',
  })
}
