import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { clearAllContextCache, invalidateTaskContext, getContextCacheStats } from '@/lib/ai/contextCache'

// Clear cache
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clear all cache or just for the user's agency
    const { searchParams } = new URL(req.url)
    const clearAll = searchParams.get('all') === 'true'

    if (clearAll && session.user.isSuperAdmin) {
      clearAllContextCache()
      return NextResponse.json({ message: 'All cache cleared' })
    } else if (session.user.agencyId) {
      invalidateTaskContext(session.user.agencyId)
      return NextResponse.json({ message: 'Agency cache cleared' })
    }

    return NextResponse.json({ error: 'No agency context' }, { status: 400 })
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}

// Get cache stats
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = getContextCacheStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting cache stats:', error)
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    )
  }
}