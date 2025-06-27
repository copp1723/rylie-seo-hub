import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'
import { encrypt } from '@/lib/encryption'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.json(
      { error: 'No authorization code provided' },
      { status: 400 }
    )
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/search-console/callback`
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get list of verified sites
    const searchConsole = google.searchconsole({
      version: 'v1',
      auth: oauth2Client,
    })
    
    const sitesResponse = await searchConsole.sites.list()
    const verifiedSites = sitesResponse.data.siteEntry?.map(site => site.siteUrl!) || []

    // Save or update tokens
    const encryptedAccessToken = encrypt(tokens.access_token!)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null

    await prisma.userSearchConsoleToken.upsert({
      where: { userId: session.user.id },
      update: {
        encryptedAccessToken,
        encryptedRefreshToken,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope || null,
        verifiedSites,
        primarySite: verifiedSites[0] || null,
      },
      create: {
        userId: session.user.id,
        encryptedAccessToken,
        encryptedRefreshToken,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope || null,
        verifiedSites,
        primarySite: verifiedSites[0] || null,
      },
    })

    // Redirect to settings page
    return NextResponse.redirect(new URL('/settings/search-console', process.env.NEXTAUTH_URL!))
  } catch (error) {
    console.error('Search Console OAuth error:', error)
    return NextResponse.json(
      { error: 'Failed to connect Search Console' },
      { status: 500 }
    )
  }
}