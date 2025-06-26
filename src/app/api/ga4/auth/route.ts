import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')

    if (action === 'authorize') {
      // Redirect to Google OAuth
      const scopes = [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/analytics.edit'
      ].join(' ')

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!)
      authUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', scopes)
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'consent')
      authUrl.searchParams.set('state', userId || session.user.id)

      return NextResponse.redirect(authUrl.toString())
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('GA4 auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}