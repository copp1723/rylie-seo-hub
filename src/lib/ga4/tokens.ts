import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/encryption'
import { google } from 'googleapis'
import { logGA4AuthEvent, AuditAction } from '@/lib/audit'

export interface GA4Tokens {
  accessToken: string
  refreshToken: string | null
  expiryDate: Date | null
  scope: string | null
  tokenType: string | null
}

/**
 * Get decrypted GA4 tokens for a user
 */
export async function getGA4Tokens(userId: string): Promise<GA4Tokens | null> {
  try {
    const tokenRecord = await prisma.userGA4Token.findUnique({
      where: { userId },
      include: {
        user: {
          select: { email: true }
        }
      }
    })

    if (!tokenRecord) {
      return null
    }

    // Decrypt tokens
    try {
      const accessToken = decryptToken(tokenRecord.encryptedAccessToken)
      const refreshToken = tokenRecord.encryptedRefreshToken
        ? decryptToken(tokenRecord.encryptedRefreshToken)
        : null

      return {
        accessToken,
        refreshToken,
        expiryDate: tokenRecord.expiryDate,
        scope: tokenRecord.scope,
        tokenType: tokenRecord.tokenType,
      }
    } catch (decryptError) {
      console.error('Failed to decrypt GA4 tokens:', decryptError)
      
      // Log decryption error
      await logGA4AuthEvent(
        AuditAction.GA4_TOKEN_DECRYPTION_ERROR,
        userId,
        tokenRecord.user.email,
        { error: (decryptError as Error).message }
      )
      
      return null
    }
  } catch (error) {
    console.error('Failed to retrieve GA4 tokens:', error)
    return null
  }
}

/**
 * Create an authenticated Google OAuth2 client with user's tokens
 */
export async function getAuthenticatedGA4Client(userId: string) {
  const tokens = await getGA4Tokens(userId)
  
  if (!tokens) {
    throw new Error('No GA4 tokens found for user')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`
  )

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate?.getTime() || null,
    token_type: tokens.tokenType || 'Bearer',
    scope: tokens.scope || undefined,
  })

  // Set up automatic token refresh
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      const { encryptToken } = await import('@/lib/encryption')
      
      // Update stored tokens
      await prisma.userGA4Token.update({
        where: { userId },
        data: {
          encryptedAccessToken: encryptToken(newTokens.access_token!),
          expiryDate: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
        },
      })

      // Log token refresh
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      })
      
      if (user) {
        await logGA4AuthEvent(
          AuditAction.GA4_TOKEN_REFRESH,
          userId,
          user.email,
          { expiryDate: newTokens.expiry_date }
        )
      }
    } catch (error) {
      console.error('Failed to update refreshed tokens:', error)
    }
  })

  return oauth2Client
}

/**
 * Delete GA4 tokens for a user
 */
export async function deleteGA4Tokens(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    })
    
    await prisma.userGA4Token.delete({
      where: { userId }
    })
    
    if (user) {
      await logGA4AuthEvent(
        AuditAction.GA4_TOKEN_DELETED,
        userId,
        user.email,
        {}
      )
    }
    
    return true
  } catch (error) {
    console.error('Failed to delete GA4 tokens:', error)
    return false
  }
}