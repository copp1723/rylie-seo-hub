import prisma from '@/lib/prisma';
import { ReportSchedule, UserGA4Token } from '@prisma/client';
import { GA4Service } from './ga4-service';
import { ReportGenerator, ReportTemplateType, ReportBrandingOptions } from './report-generator';
import { emailService } from '@/lib/email';
import { getValidGoogleAccessToken } from '@/lib/google-auth'; // For fetching/refreshing token
import cronParser from 'cron-parser';
import { GA4ReportData, DateRange } from '@/lib/types/ga4';

// Placeholder for a more robust audit logging solution if not globally available
const auditLog = (global as any).auditLog || (async (log: any) => console.log('AUDIT_LOG (ReportScheduler):', log));

/**
 * Calculates the date range for a report based on its type.
 * For simplicity, weekly reports are for the last full week (Mon-Sun),
 * monthly for the last full month, and quarterly for the last full quarter.
 * @param reportType The type of the report.
 * @param referenceDate The date to calculate from (usually today).
 */
function calculateReportDateRange(reportType: ReportSchedule['reportType'], referenceDate: Date = new Date()): DateRange {
    const today = new Date(referenceDate); // Use a copy
    today.setHours(0, 0, 0, 0); // Normalize to start of day for consistent calculations

    let startDate: Date;
    let endDate: Date;

    switch (reportType) {
        case 'WeeklySummary':
            // Last full week: Monday to Sunday
            const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
            // Move to previous Sunday
            endDate = new Date(today);
            endDate.setDate(today.getDate() - dayOfWeek);
            // Move to previous Monday (6 days before previous Sunday)
            startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - 6);
            break;
        case 'MonthlyReport':
            // Last full month
            endDate = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
            startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1); // First day of previous month
            break;
        case 'QuarterlyBusinessReview':
            // Last full quarter
            const currentQuarter = Math.floor(today.getMonth() / 3); // 0, 1, 2, 3
            const lastQuarterYear = currentQuarter === 0 ? today.getFullYear() - 1 : today.getFullYear();
            const lastQuarterStartMonth = (currentQuarter === 0 ? 9 : (currentQuarter - 1) * 3); // 0, 3, 6, 9

            startDate = new Date(lastQuarterYear, lastQuarterStartMonth, 1);
            endDate = new Date(lastQuarterYear, lastQuarterStartMonth + 3, 0); // Last day of the quarter
            break;
        default:
            throw new Error(`Unsupported report type: ${reportType}`);
    }

    return {
        startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
        endDate: endDate.toISOString().split('T')[0],   // YYYY-MM-DD
    };
}


/**
 * Processes a single report schedule.
 * Fetches GA4 data, generates report, sends email, and updates schedule status.
 * @param schedule The ReportSchedule object to process.
 */
export async function processSchedule(schedule: ReportSchedule): Promise<void> {
    await auditLog({
        event: 'REPORT_SCHEDULE_PROCESS_START',
        userId: schedule.userId,
        agencyId: schedule.agencyId,
        entityType: 'ReportSchedule',
        entityId: schedule.id,
        details: { reportType: schedule.reportType, ga4PropertyId: schedule.ga4PropertyId },
    });

    let updatedScheduleData: Partial<ReportSchedule> = {
        lastRun: new Date(),
    };

    try {
        // 1. Retrieve a valid GA4 access token
        const accessToken = await getValidGoogleAccessToken(schedule.userId);
        if (!accessToken) {
            throw new Error('Failed to retrieve valid GA4 access token.');
        }

        // 2. Initialize GA4Service
        const ga4Service = new GA4Service(schedule.userId, accessToken);

        // 3. Calculate date range
        const dateRange = calculateReportDateRange(schedule.reportType as ReportTemplateType);

        // 4. Fetch GA4 report data
        const reportData: GA4ReportData = await ga4Service.fetchComprehensiveReportData(
            schedule.ga4PropertyId,
            dateRange
        );

        // 5. Initialize ReportGeneratorService
        let brandingOptions: ReportBrandingOptions = {};
        if (schedule.brandingOptionsJson) {
            try {
                brandingOptions = JSON.parse(schedule.brandingOptionsJson);
            } catch (parseError) {
                console.warn(`Failed to parse brandingOptions for schedule ${schedule.id}:`, parseError);
                // Continue with default branding
            }
        }
        const reportGenerator = new ReportGenerator(brandingOptions);

        // 6. Generate HTML and PDF report content
        const { html, pdf } = await reportGenerator.generateReport(
            schedule.reportType as ReportTemplateType, // Assuming ReportSchedule.reportType matches ReportTemplateType values
            reportData,
            dateRange
        );

        // 7. Send email with PDF attachment
        const emailSubject = `${brandingOptions.agencyName || 'Your Agency'} - ${schedule.reportType} for ${schedule.ga4PropertyId}`;
        const emailHtmlBody = `<p>Please find attached your ${schedule.reportType} for GA4 Property ID: ${schedule.ga4PropertyId}.</p>
                               <p>Report Period: ${dateRange.startDate} to ${dateRange.endDate}</p>
                               <p>This report was automatically generated by Rylie SEO Hub.</p>`;

        const emailResult = await emailService.sendEmail({
            to: schedule.emailRecipients.join(','),
            subject: emailSubject,
            html: emailHtmlBody,
            attachments: [{
                filename: `${schedule.reportType}_${schedule.ga4PropertyId}_${dateRange.startDate}_${dateRange.endDate}.pdf`,
                content: pdf,
                contentType: 'application/pdf',
            }],
        });

        if (!emailResult.success) {
            throw new Error(`Failed to send report email: ${emailResult.error}`);
        }

        updatedScheduleData.status = 'active'; // Or 'completed_successfully'
        updatedScheduleData.lastErrorMessage = null;

        await auditLog({
            event: 'REPORT_SCHEDULE_PROCESS_SUCCESS',
            userId: schedule.userId,
            agencyId: schedule.agencyId,
            entityType: 'ReportSchedule',
            entityId: schedule.id,
            details: { reportType: schedule.reportType, emailRecipients: schedule.emailRecipients.join(',') },
        });

    } catch (error: any) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        updatedScheduleData.status = 'error';
        updatedScheduleData.lastErrorMessage = error.message || String(error);

        await auditLog({
            event: 'REPORT_SCHEDULE_PROCESS_FAILED',
            userId: schedule.userId,
            agencyId: schedule.agencyId,
            entityType: 'ReportSchedule',
            entityId: schedule.id,
            details: { error: error.message, reportType: schedule.reportType },
        });
    } finally {
        // 8. Update ReportSchedule record (lastRun, nextRun, status)
        try {
            const interval = cronParser.parseExpression(schedule.cronPattern, { currentDate: updatedScheduleData.lastRun || new Date() });
            updatedScheduleData.nextRun = interval.next().toDate();
        } catch (cronError: any) {
            console.error(`Failed to calculate nextRun for schedule ${schedule.id} due to cron pattern error: ${cronError.message}`);
            updatedScheduleData.status = 'error'; // Mark as error if cron is invalid
            updatedScheduleData.lastErrorMessage = updatedScheduleData.lastErrorMessage ?
                `${updatedScheduleData.lastErrorMessage}; Invalid cron pattern: ${cronError.message}` :
                `Invalid cron pattern: ${cronError.message}`;
             await auditLog({
                event: 'REPORT_SCHEDULE_CRON_PARSE_FAILED',
                userId: schedule.userId,
                agencyId: schedule.agencyId,
                entityType: 'ReportSchedule',
                entityId: schedule.id,
                details: { error: cronError.message, cronPattern: schedule.cronPattern },
            });
        }

        try {
            await prisma.reportSchedule.update({
                where: { id: schedule.id },
                data: updatedScheduleData,
            });
        } catch (dbError) {
            console.error(`Failed to update schedule ${schedule.id} in database:`, dbError);
            // This is a critical error, might need external alerting
            await auditLog({
                event: 'REPORT_SCHEDULE_DB_UPDATE_FAILED',
                userId: schedule.userId,
                agencyId: schedule.agencyId,
                entityType: 'ReportSchedule',
                entityId: schedule.id,
                details: { error: String(dbError), updatedData: updatedScheduleData },
            });
        }
    }
}

// Example of how this might be called by a job runner:
// async function runPendingSchedules() {
//   const now = new Date();
//   const schedulesToRun = await prisma.reportSchedule.findMany({
//     where: {
//       isActive: true,
//       nextRun: {
//         lte: now,
//       },
//       status: {
//         not: 'processing', // Avoid running a schedule already in progress
//       }
//     },
//   });

//   for (const schedule of schedulesToRun) {
//     // Mark as processing before starting
//     await prisma.reportSchedule.update({
//         where: { id: schedule.id },
//         data: { status: 'processing' }
//     });
//     await processSchedule(schedule).catch(e => console.error(`Unhandled error in processSchedule for ${schedule.id}:`, e));
//   }
// }
// setInterval(runPendingSchedules, 60000); // Run every minute
