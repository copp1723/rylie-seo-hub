// src/lib/services/scheduler-service.ts

import { GA4Service } from '@/lib/services/ga4-service';
import { DateRange, GA4ReportData } from '@/lib/types/ga4';
import {
  ReportGenerator,
  ReportTemplateType,
  ReportBrandingOptions,
} from '@/lib/services/report-generator';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma'; // Assuming prisma client might be needed for some operations here or in future
import { ReportSchedule } from '@prisma/client'; // Import the Prisma-generated type
import cronParser from 'cron-parser';

// Placeholder for auditLog if not globally defined or imported
// This ensures auditLog calls don't break if the service isn't fully wired up yet.
// TODO: Replace with a proper audit log solution if available, or remove if not used.
const auditLog = async (log: any) => console.log('AUDIT_LOG (SchedulerService):', log);

// --- Email Setup (using Nodemailer) ---
// Copied from schedule/route.ts, ensure this is configured correctly for your environment
const transporter = nodemailer.createTransport({
  jsonTransport: true, // Logs email to console, replace with actual transport for production
});

// --- Report Archival Placeholder ---
// Copied from schedule/route.ts
async function archiveReport(
  userId: string,
  scheduleId: string,
  reportType: string, // Changed from ReportTemplateType to string to match Prisma model
  dateRange: DateRange,
  htmlContent: string,
  pdfBuffer: Buffer
): Promise<{ htmlPath: string; pdfPath: string }> {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const htmlPath = `reports/${userId}/${scheduleId}/${timestamp}-${reportType.replace(/\s+/g, '_')}.html`;
  const pdfPath = `reports/${userId}/${scheduleId}/${timestamp}-${reportType.replace(/\s+/g, '_')}.pdf`;

  console.log(
    `Simulating report archival:\nHTML: ${htmlPath}\nPDF: ${pdfPath} (Size: ${pdfBuffer.length} bytes)`
  );
  await auditLog({
    event: 'REPORT_ARCHIVED_SIMULATED',
    userId,
    details: `Schedule: ${scheduleId}, HTML: ${htmlPath}, PDF: ${pdfPath}`,
  });
  return { htmlPath, pdfPath };
}


// --- Core Job Processing Logic ---
// Adapted from src/app/api/reports/schedule/route.ts
// Now uses Prisma's ReportSchedule type
export async function processSchedule(schedule: ReportSchedule): Promise<void> {
  await auditLog({
    event: 'REPORT_SCHEDULE_PROCESSING_START',
    userId: schedule.userId,
    details: `Schedule ID: ${schedule.id}`,
  });

  try {
    const endDate = new Date();
    const startDate = new Date();
    // Assuming ReportTemplateType enum values match the string values in the DB
    // It's safer to cast schedule.reportType to ReportTemplateType
    const currentReportType = schedule.reportType as ReportTemplateType;

    if (currentReportType === ReportTemplateType.WeeklySummary) {
      startDate.setDate(endDate.getDate() - 7);
    } else if (currentReportType === ReportTemplateType.MonthlyReport) {
      startDate.setMonth(endDate.getMonth() - 1);
    } else if (currentReportType === ReportTemplateType.QuarterlyReview) {
      startDate.setMonth(endDate.getMonth() - 3);
    }
    const dateRange: DateRange = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    const ga4Service = new GA4Service(schedule.userId);
    const reportData: GA4ReportData = await ga4Service.fetchComprehensiveReportData(
      schedule.ga4PropertyId,
      dateRange
    );

    // Branding options might be stored as a JSON string in Prisma model
    let brandingOptions: ReportBrandingOptions | undefined = undefined;
    if (schedule.brandingOptionsJson) {
      try {
        brandingOptions = JSON.parse(schedule.brandingOptionsJson as string) as ReportBrandingOptions;
      } catch (e) {
        console.error(`Failed to parse brandingOptionsJson for schedule ${schedule.id}:`, e);
        // Use default branding or handle error as appropriate
      }
    }


    const reportGenerator = new ReportGenerator(brandingOptions);
    const { html, pdf } = await reportGenerator.generateReport(
      currentReportType,
      reportData,
      dateRange
    );

    await archiveReport(
      schedule.userId,
      schedule.id,
      schedule.reportType,
      dateRange,
      html,
      pdf
    );

    const mailOptions = {
      from: process.env.EMAIL_FROM_ADDRESS || '"Rylie SEO Hub Reports" <noreply@example.com>',
      to: schedule.emailRecipients.join(','),
      subject: `${brandingOptions?.agencyName || 'Your'} ${schedule.reportType} for ${dateRange.startDate} to ${dateRange.endDate} is ready!`,
      html: `<p>Dear User,</p>
             <p>Your ${schedule.reportType} is attached.</p>
             <p>You can also view the HTML version (link conceptual).</p>
             <p>Thank you,<br/>Rylie SEO Hub</p>`,
      attachments: [
        {
          filename: `${schedule.reportType.replace(/\s+/g, '_')}_${dateRange.startDate}_${dateRange.endDate}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    };

    const emailInfo = await transporter.sendMail(mailOptions);
    await auditLog({
      event: 'REPORT_EMAIL_SENT_SIMULATED',
      userId: schedule.userId,
      details: `Schedule ID: ${schedule.id}, Message ID: ${emailInfo.messageId}, Recipients: ${schedule.emailRecipients.join(',')}`,
    });
    console.log('Email sent (simulated): ', JSON.stringify(emailInfo, null, 2));
    // if (emailInfo.messageId && emailInfo.messageId.includes('ethereal.email')) {
    //   console.log(`Preview URL (Ethereal): ${nodemailer.getTestMessageUrl(emailInfo)}`);
    // }

    console.log(`Schedule ${schedule.id} processed successfully.`);
    await auditLog({
      event: 'REPORT_SCHEDULE_PROCESSING_SUCCESS',
      userId: schedule.userId,
      details: `Schedule ID: ${schedule.id}`,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error processing schedule ${schedule.id}:`, error);
    await auditLog({
      event: 'REPORT_SCHEDULE_PROCESSING_ERROR',
      userId: schedule.userId,
      details: `Schedule ID: ${schedule.id}, Error: ${errorMessage}`,
    });
    throw error; // Re-throw the error so the calling function can handle it
  }
}

// --- Utility for calculating next run time ---
export function calculateNextRun(cronPattern: string, fromDate?: Date): Date {
  try {
    const options = {
      currentDate: fromDate || new Date()
    };
    const interval = cronParser.parseExpression(cronPattern, options);
    return interval.next().toDate();
  } catch (err) {
    console.error(`Error parsing cron pattern "${cronPattern}":`, err);
    // Default to 24 hours later if cron pattern is invalid
    const tomorrow = new Date((fromDate || new Date()).getTime() + 24 * 60 * 60 * 1000);
    return tomorrow;
  }
}
