import { processSchedule } from './report-scheduler'; // Assuming calculateReportDateRange is also exported or tested indirectly via processSchedule
import prisma from '@/lib/prisma';
import { GA4Service } from './ga4-service';
import { ReportGenerator, ReportTemplateType } from './report-generator';
import { emailService } from '@/lib/email';
import { getValidGoogleAccessToken } from '@/lib/google-auth';
import cronParser from 'cron-parser';
import { ReportSchedule } from '@prisma/client';

// Mock external dependencies
jest.mock('@/lib/prisma', () => ({
  reportSchedule: {
    update: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('./ga4-service');
jest.mock('./report-generator');
jest.mock('@/lib/email');
jest.mock('@/lib/google-auth');
jest.mock('cron-parser', () => ({
    parseExpression: jest.fn().mockReturnValue({
        next: jest.fn().mockReturnValue({
            toDate: jest.fn().mockReturnValue(new Date('2024-02-01T00:00:00.000Z')),
        }),
    }),
}));

// The global auditLog is now mocked in jest.setup.js
// We can get a reference to it if needed for assertions.
const mockAuditLog = (global as any).auditLog;

describe('Report Scheduler', () => {
  let mockSchedule: ReportSchedule;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations for services if they need to return specific values per test
    (GA4Service as jest.Mock).mockImplementation(() => ({
      fetchComprehensiveReportData: jest.fn().mockResolvedValue({
        organicTraffic: 100,
        organicSessions: 120,
        // ... other necessary GA4ReportData fields
      }),
    }));
    (ReportGenerator as jest.Mock).mockImplementation(() => ({
      generateReport: jest.fn().mockResolvedValue({
        html: '<html>Report</html>',
        pdf: Buffer.from('PDF Report'),
      }),
    }));
    (emailService.sendEmail as jest.Mock).mockResolvedValue({ success: true, messageId: 'test-message-id' });
    (getValidGoogleAccessToken as jest.Mock).mockResolvedValue('test-access-token');

    mockSchedule = {
      id: 'test-schedule-id',
      agencyId: 'test-agency-id',
      userId: 'test-user-id',
      cronPattern: '0 0 * * 1', // Every Monday at midnight
      ga4PropertyId: 'properties/12345',
      reportType: 'WeeklySummary',
      emailRecipients: ['test@example.com'],
      brandingOptionsJson: JSON.stringify({ agencyName: 'Test Agency' }),
      isActive: true,
      lastRun: null,
      nextRun: new Date('2024-01-01T00:00:00.000Z'),
      status: 'active',
      lastErrorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('processSchedule', () => {
    it('should successfully process a valid schedule', async () => {
      await processSchedule(mockSchedule);

      expect(getValidGoogleAccessToken).toHaveBeenCalledWith(mockSchedule.userId);
      expect(GA4Service).toHaveBeenCalledWith(mockSchedule.userId, 'test-access-token');
      const ga4Instance = (GA4Service as jest.Mock).mock.results[0].value;
      expect(ga4Instance.fetchComprehensiveReportData).toHaveBeenCalled();

      expect(ReportGenerator).toHaveBeenCalledWith({ agencyName: 'Test Agency' });
      const reportGeneratorInstance = (ReportGenerator as jest.Mock).mock.results[0].value;
      expect(reportGeneratorInstance.generateReport).toHaveBeenCalled();

      expect(emailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: mockSchedule.emailRecipients.join(','),
        subject: expect.stringContaining('Test Agency - WeeklySummary'),
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: expect.stringMatching(/^WeeklySummary_properties\/12345.*\.pdf$/),
            contentType: 'application/pdf',
          }),
        ]),
      }));

      expect(prisma.reportSchedule.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: mockSchedule.id },
        data: expect.objectContaining({
          status: 'active',
          lastErrorMessage: null,
          lastRun: expect.any(Date),
          nextRun: new Date('2024-02-01T00:00:00.000Z'), // From cronParser mock
        }),
      }));

      expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({ event: 'REPORT_SCHEDULE_PROCESS_START' }));
      expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({ event: 'REPORT_SCHEDULE_PROCESS_SUCCESS' }));
    });

    it('should handle failure in token retrieval', async () => {
      (getValidGoogleAccessToken as jest.Mock).mockResolvedValue(null);

      await processSchedule(mockSchedule);

      expect(prisma.reportSchedule.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: 'error',
          lastErrorMessage: 'Failed to retrieve valid GA4 access token.',
        }),
      }));
      expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({ event: 'REPORT_SCHEDULE_PROCESS_FAILED' }));
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle failure in GA4 data fetching', async () => {
      (GA4Service as jest.Mock).mockImplementation(() => ({
        fetchComprehensiveReportData: jest.fn().mockRejectedValue(new Error('GA4 API Error')),
      }));

      await processSchedule(mockSchedule);

      expect(prisma.reportSchedule.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: 'error',
          lastErrorMessage: 'GA4 API Error',
        }),
      }));
      expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({ event: 'REPORT_SCHEDULE_PROCESS_FAILED' }));
    });

    it('should handle failure in report generation', async () => {
      (ReportGenerator as jest.Mock).mockImplementation(() => ({
        generateReport: jest.fn().mockRejectedValue(new Error('PDF Generation Error')),
      }));

      await processSchedule(mockSchedule);

      expect(prisma.reportSchedule.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: 'error',
          lastErrorMessage: 'PDF Generation Error',
        }),
      }));
       expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({ event: 'REPORT_SCHEDULE_PROCESS_FAILED' }));
    });

    it('should handle failure in email sending', async () => {
      (emailService.sendEmail as jest.Mock).mockResolvedValue({ success: false, error: 'SMTP Error' });

      await processSchedule(mockSchedule);

      expect(prisma.reportSchedule.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: 'error',
          lastErrorMessage: 'Failed to send report email: SMTP Error',
        }),
      }));
      expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({ event: 'REPORT_SCHEDULE_PROCESS_FAILED' }));
    });

    it('should handle invalid cron pattern when calculating nextRun', async () => {
        (cronParser.parseExpression as jest.Mock).mockImplementationOnce(() => {
            throw new Error('Invalid cron string');
        });

        await processSchedule(mockSchedule);

        expect(prisma.reportSchedule.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                status: 'error',
                lastErrorMessage: expect.stringContaining('Invalid cron pattern: Invalid cron string'),
                nextRun: undefined, // nextRun should not be set if cron parsing fails
                lastRun: expect.any(Date), // lastRun is always updated
            }),
        }));
        expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({ event: 'REPORT_SCHEDULE_CRON_PARSE_FAILED' }));
        // The main process 'REPORT_SCHEDULE_PROCESS_SUCCESS' audit log might not be reached if cron parsing fails early in 'finally'
        // depending on exact execution flow. Let's verify the FAILED log is present.
        // If the intent is that process is successful UNTIL cron parsing, then the success log would be before this.
        // Given the current code, processSchedule's main try block finishes, logs SUCCESS, then finally block's cron parsing fails.
        expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({ event: 'REPORT_SCHEDULE_PROCESS_SUCCESS' }));
    });

    it('should correctly parse brandingOptionsJson', async () => {
        mockSchedule.brandingOptionsJson = JSON.stringify({ agencyName: "Custom Agency", reportTitle: "Custom Title" });
        await processSchedule(mockSchedule);
        expect(ReportGenerator).toHaveBeenCalledWith({ agencyName: "Custom Agency", reportTitle: "Custom Title" });
    });

    it('should use default brandingOptions if JSON is null or invalid', async () => {
        mockSchedule.brandingOptionsJson = null;
        await processSchedule(mockSchedule);
        expect(ReportGenerator).toHaveBeenCalledWith({}); // Default options

        mockSchedule.brandingOptionsJson = "{invalid_json";
        await processSchedule(mockSchedule);
        expect(ReportGenerator).toHaveBeenCalledWith({}); // Default options on parse error
        // Optionally, check for a warning log here if you implement one for parse errors
    });

    // TODO: Add tests for calculateReportDateRange if it's exported and used directly.
    // For now, it's tested indirectly via its usage in processSchedule mock for fetchComprehensiveReportData.
    // Example:
    // const ga4Instance = (GA4Service as jest.Mock).mock.results[0].value;
    // expect(ga4Instance.fetchComprehensiveReportData).toHaveBeenCalledWith(
    //   mockSchedule.ga4PropertyId,
    //   expect.objectContaining({ startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }) // Expected dates
    // );
  });

  // If calculateReportDateRange were exported:
  // describe('calculateReportDateRange', () => {
  //   const { calculateReportDateRange: calcRange } = jest.requireActual('./report-scheduler');
  //   it('should calculate correct range for WeeklySummary', () => {
  //     // Mock Date.now() or pass a referenceDate
  //     const refDate = new Date('2024-07-15T10:00:00.000Z'); // A Monday
  //     const range = calcRange('WeeklySummary' as ReportTemplateType, refDate);
  //     expect(range.startDate).toBe('2024-07-08'); // Previous Monday
  //     expect(range.endDate).toBe('2024-07-14');   // Previous Sunday
  //   });
  //   // ... more tests for MonthlyReport, QuarterlyBusinessReview, edge cases etc.
  // });
});
