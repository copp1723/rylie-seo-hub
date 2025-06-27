import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSearchConsoleService } from '@/lib/google/searchConsoleService'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const service = await getSearchConsoleService(session.user.id)
    const sites = await service.listSites()
    
    return NextResponse.json({ sites })
  } catch (error) {
    console.error('Search Console error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    )
  }
}