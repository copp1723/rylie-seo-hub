import { google } from 'googleapis'
import { prisma } from './prisma'
import crypto from 'crypto'

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
  const isExpired = account.expires_at && account.expires_at * 1000 < Date.now() + 5 * 60 * 1000

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

/**
 * Retrieves and decrypts the GA4 access token for a user from the UserGA4Token model.
 * This is separate from the NextAuth Account model and is used for specific GA4 API access.
 * @param userId The ID of the user.
 * @returns The decrypted access token, or null if not found or decryption fails.
 */
export async function getDecryptedGA4UserAccessToken(userId: string): Promise<string | null> {
  const tokenRecord = await prisma.userGA4Token.findUnique({
    where: { userId },
    select: { encryptedAccessToken: true },
  })

  if (!tokenRecord?.encryptedAccessToken) {
    console.warn(`No UserGA4Token record found for userId: ${userId}`)
    return null
  }

  if (!process.env.ENCRYPTION_KEY) {
    console.error('ENCRYPTION_KEY is not set. Cannot decrypt GA4 token.')
    throw new Error('Encryption key not configured.')
  }

  try {
    const parts = tokenRecord.encryptedAccessToken.split(':')
    if (parts.length !== 2) {
      console.error(`Invalid encryptedAccessToken format for userId: ${userId}. Expected iv:encryptedData.`)
      return null
    }
    const iv = Buffer.from(parts[0], 'hex')
    const encryptedData = parts[1]
    // Ensure the key is the correct length (32 bytes for aes-256-cbc)
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
    if (key.length !== 32) {
        console.error('Invalid ENCRYPTION_KEY length. Must be 64 hex characters (32 bytes).')
        throw new Error('Invalid encryption key length.')
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error(`Token decryption failed for userId: ${userId}:`, error)
    // Optionally, you might want to throw the error or handle it more gracefully
    // depending on how critical a failed decryption is for the caller.
    // For now, returning null to indicate failure.
    return null
  }
}

/**
 * Retrieves and decrypts the GA4 refresh token for a user from the UserGA4Token model.
 * @param userId The ID of the user.
 * @returns The decrypted refresh token, or null if not found, not set, or decryption fails.
 */
export async function getDecryptedGA4UserRefreshToken(userId: string): Promise<string | null> {
  const tokenRecord = await prisma.userGA4Token.findUnique({
    where: { userId },
    select: { encryptedRefreshToken: true },
  })

  if (!tokenRecord?.encryptedRefreshToken) {
    console.warn(`No encryptedRefreshToken found in UserGA4Token for userId: ${userId}`)
    return null
  }

  if (!process.env.ENCRYPTION_KEY) {
    console.error('ENCRYPTION_KEY is not set. Cannot decrypt GA4 refresh token.')
    throw new Error('Encryption key not configured.')
  }

  try {
    const parts = tokenRecord.encryptedRefreshToken.split(':')
     if (parts.length !== 2) {
      console.error(`Invalid encryptedRefreshToken format for userId: ${userId}. Expected iv:encryptedData.`)
      return null
    }
    const iv = Buffer.from(parts[0], 'hex')
    const encryptedData = parts[1]
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
     if (key.length !== 32) {
        console.error('Invalid ENCRYPTION_KEY length. Must be 64 hex characters (32 bytes).')
        throw new Error('Invalid encryption key length.')
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error(`Refresh token decryption failed for userId: ${userId}:`, error)
    return null
  }
}
