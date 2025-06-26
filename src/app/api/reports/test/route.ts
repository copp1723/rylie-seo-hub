import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GA4Service } from '@/lib/ga4'

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

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { reportType, emailRecipients } = await request.json()

    if (!reportType || !emailRecipients || emailRecipients.length === 0) {
      return NextResponse.json({ 
        error: 'Report type and email recipients are required' 
      }, { status: 400 })
    }

    // Get user's agency and GA4 property
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            ga4PropertyId: true,
            ga4PropertyName: true,
          },
        },
      },
    })

    if (!user?.agency) {
      return NextResponse.json({ 
        error: 'User not associated with an agency' 
      }, { status: 400 })
    }

    if (!user.agency.ga4PropertyId) {
      return NextResponse.json({ 
        error: 'No GA4 property connected. Please connect a GA4 property first.' 
      }, { status: 400 })
    }

    // Get access token
    const accessToken = await getDecryptedToken(session.user.id)
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'No GA4 access token found. Please reconnect your GA4 account.' 
      }, { status: 401 })
    }

    // Generate test report data
    const ga4Service = new GA4Service(accessToken)
    const seoMetrics = await ga4Service.getSEOMetrics(user.agency.ga4PropertyId)
    const topPages = await ga4Service.getTopPages(user.agency.ga4PropertyId)

    // Create email content based on report type
    const emailContent = generateReportContent(reportType, {
      agency: user.agency,
      seoMetrics,
      topPages,
      dateRange: 'Last 30 days'
    })

    // In a real implementation, you would send the email here
    // For now, we'll just simulate it
    console.log('Test report generated:', {
      reportType,
      recipients: emailRecipients,
      content: emailContent
    })

    return NextResponse.json({ 
      success: true,
      message: 'Test report generated successfully',
      data: {
        reportType,
        recipients: emailRecipients,
        seoMetrics,
        topPages: topPages.slice(0, 5), // Top 5 pages for preview
      }
    })
  } catch (error) {
    console.error('Error generating test report:', error)
    return NextResponse.json({ 
      error: 'Failed to generate test report' 
    }, { status: 500 })
  }
}

function generateReportContent(reportType: string, data: any): string {
  const { agency, seoMetrics, topPages, dateRange } = data
  
  let content = `
    <h1>${reportType.replace(/([A-Z])/g, ' $1').trim()}</h1>
    <h2>SEO Performance Report for ${agency.name}</h2>
    <p><strong>Period:</strong> ${dateRange}</p>
    <p><strong>GA4 Property:</strong> ${agency.ga4PropertyName}</p>
    
    <h3>Key Metrics</h3>
    <ul>
      <li>Total Organic Sessions: ${seoMetrics.totalSessions.toLocaleString()}</li>
      <li>Total Organic Users: ${seoMetrics.totalUsers.toLocaleString()}</li>
      <li>Average Bounce Rate: ${(seoMetrics.avgBounceRate * 100).toFixed(1)}%</li>
      <li>Average Session Duration: ${Math.round(seoMetrics.avgSessionDuration)}s</li>
    </ul>
    
    <h3>Top Performing Pages</h3>
    <ol>
  `
  
  topPages.slice(0, 5).forEach((page: any) => {
    content += `<li>${page.page} - ${page.sessions} sessions</li>`
  })
  
  content += `
    </ol>
    
    <p><em>This is a test report generated from your GA4 data.</em></p>
  `
  
  return content
}