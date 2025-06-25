// src/lib/services/report-generator.ts

import * as puppeteer from 'puppeteer'
import * as handlebars from 'handlebars'
import { GA4ReportData, DateRange } from './ga4-service' // Assuming they are in the same directory or adjust path
import { auditLog } from '@/lib/services/audit-service'

// --- Interfaces ---
export interface ReportBrandingOptions {
  agencyName?: string
  agencyLogoUrl?: string // URL to an image
  reportTitle?: string
}

export enum ReportTemplateType {
  WeeklySummary = 'Weekly SEO Summary',
  MonthlyReport = 'Monthly SEO Report',
  QuarterlyReview = 'Quarterly Business Review',
}

// --- HTML Templates (Embedded for simplicity) ---

const commonCss = `
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #333; }
  .container { width: 90%; margin: 20px auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
  header { padding: 20px; background-color: #f8f8f8; border-bottom: 1px solid #ddd; text-align: center; }
  header h1 { margin: 0; color: #444; font-size: 24px; }
  header p { margin: 5px 0 0; color: #666; }
  .report-title { text-align: center; margin: 20px 0; font-size: 20px; color: #555; }
  section { margin-bottom: 30px; padding: 15px; background-color: #fff; border: 1px solid #eee; }
  section h2 { font-size: 18px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
  th { background-color: #f2f2f2; }
  .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
  .metric-card { padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px; background: #f9f9f9; }
  .metric-card h3 { margin: 0 0 5px; font-size: 16px; color: #555; }
  .metric-card p { margin: 0; font-size: 22px; font-weight: bold; color: #333; }
  .footer { text-align: center; margin-top: 30px; padding: 15px; font-size: 12px; color: #888; border-top: 1px solid #eee; }
`

const weeklyTemplateHbs = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{branding.reportTitle}} - {{templateType}}</title>
  <style>${commonCss}</style>
</head>
<body>
  <div class="container">
    <header>
      {{#if branding.agencyLogoUrl}}<img src="{{branding.agencyLogoUrl}}" alt="{{branding.agencyName}} Logo" style="max-height: 50px; margin-bottom: 10px;">{{/if}}
      <h1>{{branding.agencyName}}</h1>
      <p>SEO Performance Report</p>
    </header>
    <h2 class="report-title">{{branding.reportTitle}} - {{templateType}} ({{dateRange.startDate}} to {{dateRange.endDate}})</h2>

    <section>
      <h2>Key Metrics Overview</h2>
      <div class="metric-grid">
        <div class="metric-card"><h3>Organic Traffic (Users)</h3><p>{{data.organicTraffic}}</p></div>
        <div class="metric-card"><h3>Organic Sessions</h3><p>{{data.organicSessions}}</p></div>
        <div class="metric-card"><h3>Engagement Rate</h3><p>{{#if data.engagementRate}}{{formatPercentage data.engagementRate}}{{else}}N/A{{/if}}</p></div>
        <div class="metric-card"><h3>Conversions</h3><p>{{data.conversions}}</p></div>
      </div>
    </section>

    {{#if data.topPages.length}}
    <section>
      <h2>Top Performing Pages (by Sessions)</h2>
      <table>
        <thead><tr><th>Page Path</th><th>Sessions</th><th>Engagement Rate</th></tr></thead>
        <tbody>
          {{#each data.topPages}}
          <tr><td>{{this.pagePath}}</td><td>{{this.sessions}}</td><td>{{#if this.engagementRate}}{{formatPercentage this.engagementRate}}{{else}}N/A{{/if}}</td></tr>
          {{/each}}
        </tbody>
      </table>
    </section>
    {{/if}}

    {{#if data.topKeywords.length}}
    <section>
      <h2>Top Keywords (from GA4 - e.g., UTM terms)</h2>
      <table>
        <thead><tr><th>Keyword</th><th>Sessions</th></tr></thead>
        <tbody>
          {{#each data.topKeywords}}
          <tr><td>{{this.keyword}}</td><td>{{this.sessions}}</td></tr>
          {{/each}}
        </tbody>
      </table>
      <p style="font-size:0.8em; color: #777;">Note: For comprehensive organic keyword performance (clicks, impressions, CTR, position), please refer to Google Search Console data.</p>
    </section>
    {{/if}}

    <div class="footer">Generated on {{currentDate}} by Rylie SEO Hub.</div>
  </div>
</body>
</html>
`

// Monthly and Quarterly templates would be more detailed. For now, let's use the weekly one as a base.
// In a real scenario, these would differ significantly.
const monthlyTemplateHbs =
  weeklyTemplateHbs.replace('Weekly SEO Summary', 'Monthly SEO Report') +
  `<!-- Monthly specific sections would go here -->`
const quarterlyTemplateHbs =
  weeklyTemplateHbs.replace('Weekly SEO Summary', 'Quarterly Business Review') +
  `<!-- Quarterly specific sections here, e.g. ROI -->`

const templates: Record<ReportTemplateType, string> = {
  [ReportTemplateType.WeeklySummary]: weeklyTemplateHbs,
  [ReportTemplateType.MonthlyReport]: monthlyTemplateHbs,
  [ReportTemplateType.QuarterlyReview]: quarterlyTemplateHbs,
}

// --- Handlebars Helpers ---
handlebars.registerHelper('formatPercentage', (value: number | undefined | null) => {
  if (typeof value !== 'number') return 'N/A'
  return `${(value * 100).toFixed(2)}%`
})

handlebars.registerHelper('formatDate', (date: Date | string | undefined | null) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

// --- Service Class ---
export class ReportGenerator {
  private branding: ReportBrandingOptions

  constructor(brandingOptions: ReportBrandingOptions = {}) {
    this.branding = {
      agencyName: 'Your Agency',
      reportTitle: 'SEO Performance Report',
      ...brandingOptions,
    }
  }

  public async generateHtml(
    templateType: ReportTemplateType,
    data: GA4ReportData,
    dateRange: DateRange
  ): Promise<string> {
    await auditLog({ event: 'REPORT_GENERATE_HTML_START', details: `Template: ${templateType}` })
    try {
      const template = handlebars.compile(templates[templateType])
      const html = template({
        data,
        branding: this.branding,
        templateType,
        dateRange,
        currentDate: new Date().toLocaleDateString(),
      })
      await auditLog({
        event: 'REPORT_GENERATE_HTML_SUCCESS',
        details: `Template: ${templateType}`,
      })
      return html
    } catch (error: any) {
      await auditLog({
        event: 'REPORT_GENERATE_HTML_ERROR',
        details: `Template: ${templateType}, Error: ${error.message}`,
      })
      console.error(`Error generating HTML for ${templateType}:`, error)
      throw new Error(`Failed to generate HTML report: ${error.message}`)
    }
  }

  public async generatePdf(htmlContent: string): Promise<Buffer> {
    await auditLog({
      event: 'REPORT_GENERATE_PDF_START',
      details: `HTML content length: ${htmlContent.length}`,
    })
    let browser
    try {
      // Launch Puppeteer. Options for running in serverless/Docker:
      // args: ['--no-sandbox', '--disable-setuid-sandbox']
      // Consider using a shared browser instance for performance if generating many PDFs.
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'], // Common args for server environments
      })
      const page = await browser.newPage()

      // Setting a realistic viewport can help with layout consistency.
      await page.setViewport({ width: 1080, height: 1024 })

      // Emulate screen media type for better print layout matching screen styles
      await page.emulateMediaType('screen')

      await page.setContent(htmlContent, { waitUntil: 'networkidle0' }) // Wait for images, etc.

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true, // Ensure background colors/images are printed
        margin: {
          // Optional margins
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      })

      await browser.close()
      await auditLog({
        event: 'REPORT_GENERATE_PDF_SUCCESS',
        details: `PDF size: ${pdfBuffer.length} bytes`,
      })
      return pdfBuffer
    } catch (error: any) {
      if (browser) {
        await browser.close()
      }
      await auditLog({ event: 'REPORT_GENERATE_PDF_ERROR', details: `Error: ${error.message}` })
      console.error('Error generating PDF:', error)
      throw new Error(`Failed to generate PDF report: ${error.message}`)
    }
  }

  public async generateReport(
    templateType: ReportTemplateType,
    data: GA4ReportData,
    dateRange: DateRange
  ): Promise<{ html: string; pdf: Buffer }> {
    const html = await this.generateHtml(templateType, data, dateRange)
    const pdf = await this.generatePdf(html)
    return { html, pdf }
  }
}

// Example Usage (conceptual)
// async function createAndSaveReport() {
//   const reportData: GA4ReportData = { /* ... fetched from GA4Service ... */ };
//   const branding: ReportBrandingOptions = { agencyName: "Client's Agency LLC", agencyLogoUrl: "url/to/logo.png" };
//   const dateRange: DateRange = { startDate: "2023-01-01", endDate: "2023-01-07" };
//   const generator = new ReportGenerator(branding);

//   try {
//     const { html, pdf } = await generator.generateReport(ReportTemplateType.WeeklySummary, reportData, dateRange);
//     // fs.writeFileSync('report.html', html);
//     // fs.writeFileSync('report.pdf', pdf);
//     console.log("Reports generated successfully.");
//   } catch (error) {
//     console.error("Failed to generate reports:", error);
//   }
// }

// Placeholder for auditLog if not already globally defined
// @ts-ignore
global.auditLog =
  global.auditLog ||
  (async (log: any) => console.log('AUDIT_LOG (placeholder ReportGenerator):', log))

// Ensure puppeteer can find Chromium.
// If running in a specific environment, you might need to set PUPPETEER_EXECUTABLE_PATH
if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  console.log(`Using Puppeteer executable path: ${process.env.PUPPETEER_EXECUTABLE_PATH}`)
} else {
  // Attempt to locate chrome automatically by puppeteer.
  // This might require additional dependencies in some Docker images (e.g., `apt-get install -y chromium`)
  console.log(
    'PUPPETEER_EXECUTABLE_PATH not set. Puppeteer will try to find Chromium automatically.'
  )
}

// Check if Puppeteer can find a suitable browser.
// This is more of a diagnostic step, not typically part of the service code itself.
// (async () => {
//   try {
//     const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
//     console.log("Puppeteer browser launched successfully for check.");
//     const version = await browser.version();
//     console.log("Browser version:", version);
//     await browser.close();
//   } catch (e) {
//     console.error("Puppeteer browser launch check failed:", e);
//     console.error("Ensure Chromium is installed and accessible, or PUPPETEER_EXECUTABLE_PATH is set correctly.");
//   }
// })();
