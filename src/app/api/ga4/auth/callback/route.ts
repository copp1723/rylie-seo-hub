import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is the userId
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=Missing authorization code`)
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=Failed to obtain tokens`)
    }

    // Encrypt and store tokens
    const crypto = require('crypto')
    const algorithm = 'aes-256-cbc'
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
    
    const encryptToken = (token: string) => {
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv(algorithm, key, iv)
      let encrypted = cipher.update(token, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      return iv.toString('hex') + ':' + encrypted
    }

    await prisma.userGA4Token.upsert({
      where: { userId: state },
      create: {
        userId: state,
        encryptedAccessToken: encryptToken(tokens.access_token),
        encryptedRefreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope || null,
        tokenType: tokens.token_type || null,
      },
      update: {
        encryptedAccessToken: encryptToken(tokens.access_token),
        encryptedRefreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope || null,
        tokenType: tokens.token_type || null,
      },
    })

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=success`)
  } catch (error) {
    console.error('GA4 callback error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/ga4?status=error&error=Authorization failed`)
  }
}
