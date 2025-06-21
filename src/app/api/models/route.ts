import { NextResponse } from 'next/server'
import { aiService } from '@/lib/ai'

export async function GET() {
  try {
    const models = aiService.getAvailableModels()
    
    return NextResponse.json({
      success: true,
      models,
    })
  } catch (error) {
    console.error('Models API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

