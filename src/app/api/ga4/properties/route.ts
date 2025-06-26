import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { GA4Service } from '@/lib/ga4'
import { prisma } from '@/lib/prisma'

async function getDecryptedToken(userId: string): Promise<string | null> {
  const tokenRecord = await prisma.userGA4Token.findUnique({
    where: { userId },
  })

  if (!tokenRecord) return null

  // Decrypt access token
  const crypto = require('crypto')
  const algorithm = 'aes-256-cbc'
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')

  try {
    const parts = tokenRecord.encryptedAccessToken.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const encryptedData = parts[1]
    const decipher = crypto.createDecipher(algorithm, key)
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Token decryption failed:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    const accessToken = await getDecryptedToken(session.user.id)
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'No GA4 access token found. Please connect your GA4 account first.' 
      }, { status: 401 })
    }

    const ga4Service = new GA4Service(accessToken)
    const properties = await ga4Service.listProperties()

    // Format properties for the frontend
    const formattedProperties = properties.map((property: any) => ({
      accountName: property.parent?.replace('accounts/', '') || 'Unknown Account',
      accountId: property.parent?.replace('accounts/', '') || '',
      propertyName: property.displayName || 'Unknown Property',
      propertyId: property.name?.replace('properties/', '') || '',
      measurementId: property.measurementId || undefined,
    }))

    return NextResponse.json({ 
      properties: formattedProperties 
    })
  } catch (error) {
    console.error('Error fetching GA4 properties:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Authentication')) {
        return NextResponse.json({ 
          error: 'Authentication failed. Please reconnect your GA4 account.' 
        }, { status: 401 })
      }
      
      if (error.message.includes('403') || error.message.includes('Access denied')) {
        return NextResponse.json({ 
          error: 'Access denied. Please ensure you have granted analytics permissions.' 
        }, { status: 403 })
      }
    }

    return NextResponse.json({ 
      error: 'Failed to fetch GA4 properties. Please try again.' 
    }, { status: 500 })
  }
}