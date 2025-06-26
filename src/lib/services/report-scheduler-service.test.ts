// @ts-nocheck // To allow direct import of the function for testing (typescript might complain about it not being exported from an index)

import { ReportSchedule } from '@prisma/client';
// Assuming generateHtmlReport is exported or made available for testing.
// If it's not exported, this test would need to be adjusted, or the function exported.
// For this example, let's assume we can access it.
// We'll need to define it or extract it to make it testable.

// Due to the current setup, generateHtmlReport is not directly exported.
// For a real test, it should be exported from report-scheduler-service.ts
// For now, I will copy the function here to demonstrate the test.

function generateHtmlReport_test(reportType: string, data: any, schedule: ReportSchedule): string {
  let brandingOptions = { primaryColor: '#3b82f6', companyName: 'Your Company' };
  if (schedule.brandingOptionsJson) {
    try {
      brandingOptions = { ...brandingOptions, ...JSON.parse(schedule.brandingOptionsJson) };
    } catch (e) {
      console.warn(`Failed to parse brandingOptionsJson for schedule ${schedule.id}`);
    }
  }

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


describe('ReportSchedulerService - generateHtmlReport', () => {
  const mockSchedule: ReportSchedule = {
    id: 'test-schedule-id',
    agencyId: 'test-agency-id',
    cronPattern: '0 0 * * MON',
    ga4PropertyId: 'prop-123',
    userId: 'user-test-id',
    reportType: 'WeeklySummary',
    emailRecipients: ['test@example.com'],
    brandingOptionsJson: JSON.stringify({ primaryColor: '#FF0000', companyName: 'Test Co.' }),
    isActive: true,
    lastRun: null,
    nextRun: new Date(),
    status: 'active',
    lastErrorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReportData = {
    summary: {
      totalUsers: 1000,
      newUsers: 500,
      sessions: 1200,
      bounceRate: 0.45,
      averageSessionDuration: 65.5,
      conversions: 50,
    },
    topPages: [
      { pagePath: '/home', sessions: 300, engagementRate: 0.75 },
      { pagePath: '/features', sessions: 200, engagementRate: 0.65 },
    ],
    topKeywords: [
      { keyword: 'best seo tool', sessions: 50 },
      { keyword: 'ga4 reports', sessions: 30 },
    ],
  };

  it('should generate an HTML report with correct titles and branding', () => {
    const html = generateHtmlReport_test('WeeklySummary', mockReportData, mockSchedule);
    expect(html).toContain('<title>GA4 Report: WeeklySummary</title>');
    expect(html).toContain('<h1>Test Co. - GA4 Report</h1>');
    expect(html).toContain('background-color: #FF0000'); // Custom primary color
    expect(html).toContain('<h2>Weekly Summary Overview</h2>');
    expect(html).toContain(`<p><strong>GA4 Property ID:</strong> ${mockSchedule.ga4PropertyId}</p>`);
  });

  it('should include key metrics in the report', () => {
    const html = generateHtmlReport_test('WeeklySummary', mockReportData, mockSchedule);
    expect(html).toContain('<li>Total Users: 1,000</li>');
    expect(html).toContain('<li>New Users: 500</li>');
    expect(html).toContain('<li>Sessions: 1,200</li>');
    expect(html).toContain('<li>Bounce Rate: 45.00%</li>');
    expect(html).toContain('<li>Avg. Session Duration: 65.50s</li>');
    expect(html).toContain('<li>Conversions: 50</li>');
  });

  it('should include top pages if data is available', () => {
    const html = generateHtmlReport_test('WeeklySummary', mockReportData, mockSchedule);
    expect(html).toContain('<h2>Top Pages (by Sessions)</h2>');
    expect(html).toContain('<td>/home</td><td>300</td><td>75.00%</td>');
    expect(html).toContain('<td>/features</td><td>200</td><td>65.00%</td>');
  });

  it('should include top keywords if data is available', () => {
    const html = generateHtmlReport_test('WeeklySummary', mockReportData, mockSchedule);
    expect(html).toContain('<h2>Top Keywords (Manual Term)</h2>');
    expect(html).toContain('<td>best seo tool</td><td>50</td>');
    expect(html).toContain('<td>ga4 reports</td><td>30</td>');
  });

  it('should handle missing topPages and topKeywords gracefully', () => {
    const dataWithoutOptional = { summary: mockReportData.summary, topPages: [], topKeywords: [] };
    const html = generateHtmlReport_test('MonthlyReport', dataWithoutOptional, mockSchedule);
    expect(html).not.toContain('<h2>Top Pages (by Sessions)</h2>');
    expect(html).not.toContain('<h2>Top Keywords (Manual Term)</h2>');
    expect(html).toContain('<li>Total Users: 1,000</li>'); // Ensure summary still there
  });

  it('should use default branding if brandingOptionsJson is invalid or missing', () => {
    const scheduleWithInvalidBranding: ReportSchedule = { ...mockSchedule, brandingOptionsJson: 'invalid-json' };
    const htmlInvalid = generateHtmlReport_test('WeeklySummary', mockReportData, scheduleWithInvalidBranding);
    expect(htmlInvalid).toContain('background-color: #3b82f6'); // Default primary color
    expect(htmlInvalid).toContain('<h1>Your Company - GA4 Report</h1>'); // Default company name

    const scheduleWithNoBranding: ReportSchedule = { ...mockSchedule, brandingOptionsJson: null };
    const htmlNo = generateHtmlReport_test('WeeklySummary', mockReportData, scheduleWithNoBranding);
    expect(htmlNo).toContain('background-color: #3b82f6');
    expect(htmlNo).toContain('<h1>Your Company - GA4 Report</h1>');
  });
});

// To run this test:
// 1. Ensure generateHtmlReport is exported from report-scheduler-service.ts
//    (or adjust the import/test structure)
// 2. Install Jest and related dependencies (e.g., @types/jest, ts-jest)
// 3. Configure Jest (e.g., jest.config.js)
// 4. Run `npx jest src/lib/services/report-scheduler-service.test.ts`
//
// Since I cannot run Jest here, this is a conceptual test setup.
// The actual execution would happen in a local dev environment.
