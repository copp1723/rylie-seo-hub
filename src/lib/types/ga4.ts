// src/lib/types/ga4.ts

export interface DateRange {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}

export interface GA4ReportData {
  organicTraffic: number
  organicSessions: number
  // Standard Reports:
  totalUsers?: number
  newUsers?: number
  sessions?: number
  averageSessionDuration?: string // Formatted string like "00:05:30"
  bounceRate?: number // Percentage e.g. 0.45 for 45%
  conversions?: number // Specific to GA4 "conversions" event
  // SEO Specific:
  topKeywords: Array<{
    keyword: string
    clicks?: number
    impressions?: number
    ctr?: number
    position?: number
    sessions?: number
  }> // Sessions for GA4, others from GSC
  topPages: Array<{
    pagePath: string
    pageTitle?: string
    sessions: number
    engagementRate?: number
    conversions?: number
  }> // GA4 metrics
  goalCompletions?: number // This might be redundant if 'conversions' covers it, or map to specific conversion events.
  // Additional useful metrics
  sessionsPerUser?: number
  screenPageViews?: number
  screenPageViewsPerSession?: number
  engagementRate?: number // Overall engagement rate
}

// Potentially other GA4 related types can be added here in the future.
