// src/lib/services/ga4-report-processor.ts

import { analyticsdata_v1beta } from 'googleapis'
import {
  GA4ReportData,
  DateRange, // Assuming DateRange might be needed by a processor function, if not, it can be removed.
} from '@/lib/types/ga4'

// --- Extracted Report Processing Logic ---

export function processReportResponse(
  report: analyticsdata_v1beta.Schema$RunReportResponse
  // dateRange: DateRange // Keep for context if needed later, currently unused by this specific function after extraction
): GA4ReportData {
  const result: GA4ReportData = {
    organicTraffic: 0,
    organicSessions: 0,
    totalUsers: 0,
    newUsers: 0,
    sessions: 0,
    averageSessionDuration: '00:00:00',
    bounceRate: 0,
    conversions: 0,
    topKeywords: [],
    topPages: [],
    goalCompletions: 0,
    sessionsPerUser: 0,
    screenPageViews: 0,
    screenPageViewsPerSession: 0,
    engagementRate: 0,
  }

  if (!report.rows || report.rows.length === 0) {
    console.warn('GA4 processReportResponse: No rows in report data.')
    if (report.totals && report.totals.length > 0) {
      const totalRow = report.totals[0]
      const metricValues = totalRow.metricValues || []
      report.metricHeaders?.forEach((header, index) => {
        const value = metricValues[index]?.value
        if (value && header.name) {
          mapMetricToResult(result, header.name, value, true)
        }
      })
    }
    return result
  }

  report.rows.forEach(row => {
    const dimensionValues = row.dimensionValues || []
    const metricValues = row.metricValues || []
    const channelGroup = dimensionValues[0]?.value
    const isOrganic = channelGroup === 'Organic Search'

    report.metricHeaders?.forEach((header, index) => {
      const value = metricValues[index]?.value
      if (value && header.name) {
        mapMetricToResult(result, header.name, value, true, isOrganic)
      }
    })
  })

  if (result.sessions && result.totalUsers && result.totalUsers > 0) {
    result.sessionsPerUser = parseFloat((result.sessions / result.totalUsers).toFixed(2))
  }
  if (result.sessions && result.screenPageViews && result.sessions > 0) {
    result.screenPageViewsPerSession = parseFloat(
      (result.screenPageViews / result.sessions).toFixed(2)
    )
  }
  return result
}

export function mapMetricToResult(
  result: GA4ReportData,
  metricName: string,
  value: string,
  isAggregation: boolean,
  isOrganicSource: boolean = false
): void {
  const numValue = parseFloat(value)
  if (isNaN(numValue)) return

  switch (metricName) {
    case 'totalUsers':
      result.totalUsers =
        isAggregation && result.totalUsers ? result.totalUsers + numValue : numValue
      if (isOrganicSource) {
        result.organicTraffic =
          isAggregation && result.organicTraffic ? result.organicTraffic + numValue : numValue
      }
      break
    case 'newUsers':
      result.newUsers = isAggregation && result.newUsers ? result.newUsers + numValue : numValue
      break
    case 'sessions':
      result.sessions = isAggregation && result.sessions ? result.sessions + numValue : numValue
      if (isOrganicSource) {
        result.organicSessions =
          isAggregation && result.organicSessions ? result.organicSessions + numValue : numValue
      }
      break
    case 'averageSessionDuration':
      if (
        !isAggregation ||
        (isAggregation && !result.averageSessionDuration) ||
        result.averageSessionDuration === '00:00:00'
      ) {
        const totalSeconds = Math.round(numValue)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        result.averageSessionDuration = `${String(hours).padStart(2, '0')}:${String(
          minutes
        ).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      }
      break
    case 'bounceRate':
      result.bounceRate = numValue
      break
    case 'engagementRate':
      result.engagementRate = numValue
      break
    case 'conversions':
      result.conversions =
        isAggregation && result.conversions ? result.conversions + numValue : numValue
      result.goalCompletions = result.conversions // Assuming direct mapping for now
      break
    case 'screenPageViews':
      result.screenPageViews =
        isAggregation && result.screenPageViews ? result.screenPageViews + numValue : numValue
      break
  }
}

export function processTopPagesResponse(
  report: analyticsdata_v1beta.Schema$RunReportResponse
): Array<{
  pagePath: string
  pageTitle?: string
  sessions: number
  engagementRate?: number
  conversions?: number
}> {
  const pages: Array<{
    pagePath: string
    pageTitle?: string
    sessions: number
    engagementRate?: number
    conversions?: number
  }> = []
  if (!report.rows) return pages

  report.rows.forEach(row => {
    const pagePath = row.dimensionValues?.[0]?.value || '(not set)'
    const pageTitle = row.dimensionValues?.[1]?.value || '(not set)'
    const sessions = parseFloat(row.metricValues?.[0]?.value || '0')
    const engagementRate = parseFloat(row.metricValues?.[1]?.value || '0')
    const conversions = parseFloat(row.metricValues?.[2]?.value || '0')
    pages.push({ pagePath, pageTitle, sessions, engagementRate, conversions })
  })
  return pages
}

export function processTopKeywordsResponse(
  report: analyticsdata_v1beta.Schema$RunReportResponse
): Array<{ keyword: string; sessions?: number }> {
  const keywords: Array<{ keyword: string; sessions?: number }> = []
  if (!report.rows) return keywords

  report.rows.forEach(row => {
    const keyword = row.dimensionValues?.[0]?.value || '(not set)'
    if (
      keyword &&
      keyword.toLowerCase() !== '(not set)' &&
      keyword.toLowerCase() !== '(not provided)'
    ) {
      const sessions = parseFloat(row.metricValues?.[0]?.value || '0')
      keywords.push({ keyword, sessions })
    }
  })
  return keywords
}
