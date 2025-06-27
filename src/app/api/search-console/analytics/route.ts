import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSearchConsoleService } from '@/lib/google/searchConsoleService'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const siteUrl = searchParams.get('siteUrl')
  const metric = searchParams.get('metric') || 'queries'
  const days = parseInt(searchParams.get('days') || '28')

  if (!siteUrl) {
    return NextResponse.json(
      { error: 'Site URL required' },
      { status: 400 }
    )
  }

  try {
    const service = await getSearchConsoleService(session.user.id)
    
    let data
    switch (metric) {
      case 'queries':
        data = await service.getTopQueries(siteUrl, days)
        break
      case 'pages':
        data = await service.getTopPages(siteUrl, days)
        break
      case 'performance':
        data = await service.getSearchAnalytics(siteUrl, {
          startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          dimensions: ['date'],
        })
        break
      default:
        return NextResponse.json(
          { error: 'Invalid metric' },
          { status: 400 }
        )
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Search Console analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}