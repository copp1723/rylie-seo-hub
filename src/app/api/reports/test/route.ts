import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
// Use the more advanced GA4Service
import { GA4Service } from '@/lib/services/ga4-service'
import { getDecryptedGA4UserAccessToken } from '@/lib/google-auth'


export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { reportType, emailRecipients, dateRangeString } = body // Added dateRangeString for flexibility

    if (!reportType) { // emailRecipients might not be needed if just testing data fetch
      return NextResponse.json({ 
        error: 'Report type is required'
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
      return NextResponse.json({ error: 'User not associated with an agency' }, { status: 400 })
    }

    if (!user.agency.ga4PropertyId) {
      return NextResponse.json({ error: 'No GA4 property connected for this agency.' }, { status: 400 })
    }

    // Get access token using the new utility
    const accessToken = await getDecryptedGA4UserAccessToken(session.user.id)
    if (!accessToken) {
      return NextResponse.json({ error: 'No GA4 access token found or decryption failed. Please reconnect your GA4 account via settings.' }, { status: 401 })
    }

    // Instantiate the new GA4Service
    const ga4Service = new GA4Service(session.user.id, accessToken)

    // Determine date range for the test report
    // Example: "last7Days", "last30Days", or a custom "YYYY-MM-DD/YYYY-MM-DD"
    let dateRange;
    if (dateRangeString && dateRangeString.includes('/')) {
        const [start, end] = dateRangeString.split('/');
        dateRange = { startDate: start, endDate: end };
    } else { // Default to last 7 days for test
        const today = new Date();
        const defaultStartDate = new Date();
        defaultStartDate.setDate(today.getDate() - 7);
        dateRange = {
            startDate: defaultStartDate.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0],
        };
    }

    // Fetch comprehensive data using the new service
    const comprehensiveData = await ga4Service.fetchComprehensiveReportData(user.agency.ga4PropertyId, dateRange)

    // Use a simplified version of report generation for the test endpoint,
    // or reuse the one from report-scheduler-service if it's made available.
    // For simplicity here, we'll just return the raw data.
    // If emailRecipients are provided, one could simulate sending:
    if (emailRecipients && emailRecipients.length > 0) {
        console.log(`Simulating sending test report of type ${reportType} to ${emailRecipients.join(', ')} with data for range ${dateRange.startDate}-${dateRange.endDate}`);
        // Here you could use the generateHtmlReport from report-scheduler-service if you choose to import/export it
        // const htmlForEmail = generateHtmlReport(reportType, comprehensiveData, { ...user.agency, ... }); // Simplified schedule object
        // And then emailService.sendEmail(...)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Test report data fetched successfully.',
      reportType,
      ga4PropertyId: user.agency.ga4PropertyId,
      dateRange,
      data: comprehensiveData, // Return the comprehensive data
    })
  } catch (error: any) {
    console.error('Error generating test report data:', error)
    let errorMessage = 'Failed to generate test report data.'
    if (error.message) {
        errorMessage += ` Error: ${error.message}`
    }
    // Check for specific GA4 errors if possible (e.g. from error structure)
    // if (error.code === 403) errorMessage = "Access to GA4 property denied. Check permissions."
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// The local generateReportContent function can be removed if not used,
// or kept if this endpoint should have a distinct quick preview format.
// For now, removing it as we are returning raw data.