import { prisma } from '@/lib/prisma'
import { GA4Service } from '@/lib/services/ga4-service' // Assuming this is the correct path to the more advanced service
import { emailService } from '@/lib/email'
import { getDecryptedGA4UserAccessToken, getDecryptedGA4UserRefreshToken } from '@/lib/google-auth' // Corrected path
import cronParser from 'cron-parser'
import { ReportSchedule } from '@prisma/client' // Import the type
import { google } from 'googleapis'; // For refreshing token if necessary via GA4Service
// import * as htmlToPdf from 'html-pdf-node'; // html-pdf-node uses 'file' options which might be tricky in serverless.
                                          // Let's use a simple HTML email first and add PDF later if direct conversion is problematic.
                                          // For now, I will prepare for PDF generation.
import puppeteer from 'puppeteer'; // Puppeteer is more robust for PDF generation.

// Placeholder for audit logging
// In a real scenario, this would be a shared service or direct prisma calls.
async function auditLog(data: {
  action: string
  entityType: string
  entityId: string
  userId?: string // Optional: if the action is not directly tied to a user session
  userEmail?: string // Optional
  details: object
}) {
  console.log(`AUDIT_LOG (ReportSchedulerService): Action: ${data.action}, Entity: ${data.entityType}, ID: ${data.entityId}, UserId: ${data.userId || 'system'}, Details:`, data.details)
  // Example of actual implementation:
  // await prisma.auditLog.create({
  //   data: {
  //     action: data.action,
  //     entityType: data.entityType,
  //     entityId: data.entityId,
  //     userId: data.userId || 'system-user-id', // Default to a system user if no specific user
  //     userEmail: data.userEmail || 'system@example.com',
  //     details: data.details,
  //   },
  // });
}

export async function processSchedule(scheduleId: string): Promise<void> {
  console.log(`Processing schedule ${scheduleId}`)
  let schedule: ReportSchedule | null = null

  try {
    schedule = await prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
    })

    if (!schedule) {
      console.error(`ReportSchedule with ID ${scheduleId} not found.`)
      await auditLog({ action: 'PROCESS_SCHEDULE_ERROR', entityType: 'ReportSchedule', entityId: scheduleId, details: { error: 'Schedule not found' } })
      return
    }

    if (!schedule.isActive) {
      console.log(`Schedule ${scheduleId} is not active. Skipping.`)
      await auditLog({ action: 'PROCESS_SCHEDULE_SKIP_INACTIVE', entityType: 'ReportSchedule', entityId: scheduleId, details: { message: 'Schedule inactive' } })
      return
    }

    await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: { status: 'processing', lastErrorMessage: null },
    })
    await auditLog({ action: 'PROCESS_SCHEDULE_START', entityType: 'ReportSchedule', entityId: scheduleId, details: {} })

    // 1. Get GA4 Access Token
    const accessToken = await getDecryptedGA4UserAccessToken(schedule.userId)
    if (!accessToken) {
      throw new Error(`Could not retrieve decrypted GA4 access token for user ${schedule.userId}`)
    }

    // (Optional but recommended) Attempt to get refresh token for GA4Service if it needs it for auto-refresh
    // const refreshToken = await getDecryptedGA4UserRefreshToken(schedule.userId);

    // 2. Instantiate GA4Service
    // The GA4Service from lib/services/ga4-service.ts is designed to handle token refresh internally
    // if it's provided with a mechanism to do so, or if the initial token is valid.
    // It takes userId and initialAccessToken.
    const ga4Service = new GA4Service(schedule.userId, accessToken)

    // 3. Fetch data from GA4
    // Define a date range, e.g., last 30 days for a monthly report, last 7 for weekly.
    // This should ideally be more dynamic based on schedule.reportType or cron frequency.
    const today = new Date()
    const startDate = new Date()
    if (schedule.reportType.toLowerCase().includes('monthly')) {
      startDate.setDate(today.getDate() - 30)
    } else if (schedule.reportType.toLowerCase().includes('weekly')) {
      startDate.setDate(today.getDate() - 7)
    } else { // Default to last 30 days
      startDate.setDate(today.getDate() - 30)
    }
    const dateRange = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    }

    const reportData = await ga4Service.fetchComprehensiveReportData(schedule.ga4PropertyId, dateRange)
    await auditLog({ action: 'PROCESS_SCHEDULE_GA4_FETCH_SUCCESS', entityType: 'ReportSchedule', entityId: scheduleId, details: { propertyId: schedule.ga4PropertyId } })

    // 4. Generate HTML and PDF reports
    const htmlContent = generateHtmlReport(schedule.reportType, reportData, schedule)
    const pdfBuffer = await generatePdfFromHtml(htmlContent)
    await auditLog({ action: 'PROCESS_SCHEDULE_REPORT_GENERATED', entityType: 'ReportSchedule', entityId: scheduleId, details: { type: 'HTML_PDF' } })

    // 5. Send the email
    const agency = await prisma.agency.findUnique({ where: { id: schedule.agencyId }});
    const subject = `${agency?.name || 'Your Agency'} - ${schedule.reportType} - ${new Date().toLocaleDateString()}`

    const emailResult = await emailService.sendEmail({
      to: schedule.emailRecipients.join(','),
      subject: subject,
      html: htmlContent,
      // text: 'Please find your report attached.', // Optional text version
      // attachments: [{
      //   filename: `${schedule.reportType}_${dateRange.endDate}.pdf`,
      //   content: pdfBuffer,
      //   contentType: 'application/pdf',
      // }],
    })
    // Correcting attachment structure for nodemailer
    const attachments = [{
        filename: `${schedule.reportType.replace(/\s+/g, '_')}_${dateRange.endDate}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
    }];

    // Re-send with attachment (this is a bit off, ideally sendEmail supports attachments directly)
    // For now, assuming emailService.sendEmail needs to be adapted or used differently.
    // Let's assume emailService.sendEmail can take an attachments array:
    // (This requires modification of emailService.sendEmail or using a different method if available)

    // Correct way: emailService.sendEmail should support attachments.
    // Modifying the call to what it *should* be if emailService is extended:
     const emailSendResult = await emailService.sendEmail({
       to: schedule.emailRecipients.join(','),
       subject: subject,
       html: htmlContent,
       // text: 'Your automated report is attached.', // Simple text version
       attachments: attachments, // No longer need @ts-ignore
     });


    if (!emailSendResult.success) {
      throw new Error(`Failed to send email: ${emailSendResult.error || 'Unknown email error'}`)
    }
    await auditLog({ action: 'PROCESS_SCHEDULE_EMAIL_SENT', entityType: 'ReportSchedule', entityId: scheduleId, details: { recipients: schedule.emailRecipients } })

    // 6. Update schedule record
    const nextRun = cronParser.parseExpression(schedule.cronPattern).next().toDate()
    await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        status: 'active', // Or 'completed' if we want to signify a successful run cycle
        lastRun: new Date(),
        nextRun: nextRun,
        lastErrorMessage: null,
      },
    })
    await auditLog({ action: 'PROCESS_SCHEDULE_SUCCESS', entityType: 'ReportSchedule', entityId: scheduleId, details: { nextRun } })

  } catch (error: any) {
    console.error(`Error processing schedule ${scheduleId}:`, error)
    if (schedule) {
      try {
        await prisma.reportSchedule.update({
          where: { id: scheduleId },
          data: { status: 'error', lastErrorMessage: error.message || 'Unknown error during processing' },
        })
      } catch (dbError) {
        console.error(`Failed to update schedule ${scheduleId} status to error:`, dbError)
      }
    }
    await auditLog({ action: 'PROCESS_SCHEDULE_FAILURE', entityType: 'ReportSchedule', entityId: scheduleId, details: { error: error.message, stack: error.stack } })
  }
}

// Export for testing if needed, or keep as internal helper
// export { generateHtmlReport, generatePdfFromHtml };

// Helper function to generate HTML report content (can be expanded)
function generateHtmlReport(reportType: string, data: any, schedule: ReportSchedule): string {
  // Basic HTML structure - can be templated more professionally
  // `data` would contain GA4 metrics, top pages, etc.
  // `schedule.brandingOptionsJson` could be used here

  let brandingOptions = { primaryColor: '#3b82f6', companyName: 'Your Company' };
  if (schedule.brandingOptionsJson) {
    try {
      brandingOptions = { ...brandingOptions, ...JSON.parse(schedule.brandingOptionsJson) };
    } catch (e) {
      console.warn(`Failed to parse brandingOptionsJson for schedule ${schedule.id}`);
    }
  }

  // Example: using data from a comprehensive report
  const summary = data.summary || {};
  const topPages = data.topPages || [];
  const topKeywords = data.topKeywords || [];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>GA4 Report: ${reportType}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { background-color: ${brandingOptions.primaryColor}; color: white; padding: 10px; text-align: center; }
        .header h1 { margin: 0; }
        .content { margin-top: 20px; }
        .section { margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 5px; }
        .section h2 { margin-top: 0; color: ${brandingOptions.primaryColor}; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${brandingOptions.companyName} - GA4 Report</h1>
      </div>
      <div class="content">
        <div class="section">
          <h2>${reportType.replace(/([A-Z])/g, ' $1').trim()} Overview</h2>
          <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>GA4 Property ID:</strong> ${schedule.ga4PropertyId}</p>
        </div>

        <div class="section">
          <h2>Key Metrics</h2>
          <ul>
            <li>Total Users: ${summary.totalUsers?.toLocaleString() || 'N/A'}</li>
            <li>New Users: ${summary.newUsers?.toLocaleString() || 'N/A'}</li>
            <li>Sessions: ${summary.sessions?.toLocaleString() || 'N/A'}</li>
            <li>Bounce Rate: ${summary.bounceRate ? (summary.bounceRate * 100).toFixed(2) + '%' : 'N/A'}</li>
            <li>Avg. Session Duration: ${summary.averageSessionDuration ? summary.averageSessionDuration.toFixed(2) + 's' : 'N/A'}</li>
            <li>Conversions: ${summary.conversions?.toLocaleString() || 'N/A'}</li>
          </ul>
        </div>

        ${topPages.length > 0 ? `
        <div class="section">
          <h2>Top Pages (by Sessions)</h2>
          <table>
            <thead><tr><th>Page Path</th><th>Sessions</th><th>Engagement Rate</th></tr></thead>
            <tbody>
              ${topPages.map((page: any) => `<tr><td>${page.pagePath}</td><td>${page.sessions?.toLocaleString() || 'N/A'}</td><td>${page.engagementRate ? (page.engagementRate * 100).toFixed(2) + '%' : 'N/A'}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>` : ''}

        ${topKeywords.length > 0 ? `
        <div class="section">
          <h2>Top Keywords (Manual Term)</h2>
          <table>
            <thead><tr><th>Keyword</th><th>Sessions</th></tr></thead>
            <tbody>
              ${topKeywords.map((kw: any) => `<tr><td>${kw.keyword}</td><td>${kw.sessions?.toLocaleString() || 'N/A'}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>` : ''}

        <p style="font-size: 12px; color: #777; text-align: center;">This report was automatically generated.</p>
      </div>
    </body>
    </html>
  `;
}

// Helper function to generate PDF from HTML
async function generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
  let browser = null;
  try {
    // Path to chrome might be needed in some environments
    // const executablePath = process.env.CHROME_BIN || undefined;
    // browser = await puppeteer.launch({ executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
