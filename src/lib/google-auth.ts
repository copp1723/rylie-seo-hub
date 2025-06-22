import { google } from 'googleapis'
import { prisma } from './prisma'

/**
 * Refreshes a Google OAuth access token using the refresh token
 */
export async function refreshGoogleAccessToken(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  )

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  })

  try {
    const { credentials } = await oauth2Client.refreshAccessToken()
    return {
      access_token: credentials.access_token!,
      expires_at: Math.floor(credentials.expiry_date! / 1000),
      refresh_token: credentials.refresh_token || refreshToken,
    }
  } catch (error) {
    console.error('Error refreshing access token:', error)
    throw new Error('Failed to refresh access token')
  }
}

/**
 * Gets a valid access token for a user, refreshing if necessary
 */
export async function getValidGoogleAccessToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  })

  if (!account?.access_token) {
    throw new Error('No Google account connected')
  }

  // Check if token is expired (with 5 minute buffer)
  const isExpired = account.expires_at && (account.expires_at * 1000) < (Date.now() + 5 * 60 * 1000)

  if (isExpired && account.refresh_token) {
    try {
      // Refresh the token
      const newTokens = await refreshGoogleAccessToken(account.refresh_token)
      
      // Update the database
      await prisma.account.updateMany({
        where: {
          userId,
          provider: 'google',
        },
        data: {
          access_token: newTokens.access_token,
          expires_at: newTokens.expires_at,
          refresh_token: newTokens.refresh_token,
        },
      })

      return newTokens.access_token
    } catch (error) {
      console.error('Failed to refresh token:', error)
      throw new Error('Token expired and refresh failed. Please re-authenticate.')
    }
  }

  return account.access_token
}