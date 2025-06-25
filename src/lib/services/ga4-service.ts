// src/lib/services/ga4-service.ts

import { google, analyticsdata_v1beta, analyticsadmin_v1alpha } from 'googleapis' // Added analyticsadmin_v1alpha
import { auditLog } from '@/lib/services/audit-service' // Assuming audit-service.ts exports this
import { refreshAccessTokenFinal } from '@/app/api/ga4/auth/route' // Import the refresh function
import { DateRange, GA4ReportData } from '@/lib/types/ga4' // Import extracted types

// Helper to get the OAuth2 client
// In a real app, the userId would be known, and you'd fetch their specific tokens.
// For now, this is simplified. The GA4Service instance would likely be created
// in a context where userId and their tokens are available.
async function getAuthenticatedClient(userId: string, accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
    // No redirect URI needed for API calls once tokens are obtained
  )
  oauth2Client.setCredentials({ access_token: accessToken })
  return oauth2Client
}

// Placeholder for fetching stored access token for a user
// This would typically involve decrypting a token from your database.
// For this service, we'll assume the access token is passed in,
// or the service is instantiated for a specific user.
async function getAccessTokenForUser(userId: string): Promise<string | null> {
  // In a real app:
  // 1. Fetch encrypted tokens from DB for userId.
  // 2. Decrypt access token.
  // 3. If expired, use refresh token (calling refreshAccessTokenFinal) to get a new one.
  // 4. Return the valid (decrypted) access token.
  console.warn(`getAccessTokenForUser for ${userId} is a placeholder. Returning dummy token.`)
  // This function needs a proper implementation to fetch and manage tokens.
  // For now, let's assume the caller of GA4Service methods will provide a valid token,
  // or the refresh mechanism will handle it.
  return 'dummy-access-token' // Placeholder
}

export class GA4Service {
  private userId: string
  private accessToken: string | null // Current access token for the user

  constructor(userId: string, initialAccessToken?: string) {
    this.userId = userId
    this.accessToken = initialAccessToken || null
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('GA4Service: Google OAuth client credentials are not configured.')
      throw new Error('Google OAuth client credentials are not configured.')
    }
  }

  private async getValidAccessToken(): Promise<string> {
    if (!this.accessToken) {
      // Attempt to fetch it if not provided initially (e.g. from DB)
      // This part needs a robust implementation, likely involving `getTokensFinal` from auth route,
      // then decryption. For now, it's simplified.
      const fetchedToken = await getAccessTokenForUser(this.userId) // Placeholder
      if (!fetchedToken) {
        await auditLog({
          event: 'GA4_ACCESS_TOKEN_MISSING',
          userId: this.userId,
          details: 'Access token not available and could not be fetched.',
        })
        throw new Error('Access token not available for GA4 service.')
      }
      this.accessToken = fetchedToken
    }
    // If token exists, it might be expired. The actual API call will determine this.
    // The `runRequestWithRetry` method handles token refresh on auth errors.
    return this.accessToken
  }

  private async runRequestWithRetry<T>(
    requestFn: (authClient: google.auth.OAuth2) => Promise<T>,
    attempt = 1
  ): Promise<T> {
    if (attempt > 2) {
      // Allow one retry after token refresh
      await auditLog({
        event: 'GA4_API_REQUEST_FAILED_MAX_RETRIES',
        userId: this.userId,
        details: 'GA4 API request failed after token refresh and retry.',
      })
      throw new Error('GA4 API request failed after multiple retries.')
    }

    try {
      const token = await this.getValidAccessToken()
      const authClient = await getAuthenticatedClient(this.userId, token)
      return await requestFn(authClient)
    } catch (error: unknown) {
      let errorMessage = 'An unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
      }

      // Check if the error is a Google API like error with a 'code' property
      // This is a common pattern for GaxiosError from googleapis
      const potentialGaxiosError = error as { code?: number; message?: string; errors?: unknown[] }

      if (
        potentialGaxiosError.code === 401 ||
        (potentialGaxiosError.code === 403 &&
          typeof potentialGaxiosError.message === 'string' &&
          potentialGaxiosError.message.includes('auth'))
      ) {
        await auditLog({
          event: 'GA4_ACCESS_TOKEN_EXPIRED_OR_INVALID',
          userId: this.userId,
          details: `Attempt: ${attempt}. Refreshing token. Error code: ${potentialGaxiosError.code}`,
        })
        try {
          const newAccessToken = await refreshAccessTokenFinal(this.userId)
          if (!newAccessToken) {
            await auditLog({
              event: 'GA4_TOKEN_REFRESH_NO_NEW_TOKEN',
              userId: this.userId,
              details: 'Refresh token flow did not return a new access token.',
            })
            throw new Error('Failed to refresh access token, no new token returned.')
          }
          this.accessToken = newAccessToken // Update the stored access token
          await auditLog({
            event: 'GA4_ACCESS_TOKEN_REFRESHED_SUCCESS_SERVICE',
            userId: this.userId,
            details: 'Access token refreshed successfully, retrying API call.',
          })
          return this.runRequestWithRetry(requestFn, attempt + 1) // Retry the request
        } catch (refreshError: unknown) {
          const refreshErrorMessage =
            refreshError instanceof Error ? refreshError.message : String(refreshError)
          await auditLog({
            event: 'GA4_TOKEN_REFRESH_FAILED_SERVICE',
            userId: this.userId,
            details: `Failed to refresh token: ${refreshErrorMessage}`,
          })
          throw new Error(`Failed to refresh GA4 access token: ${refreshErrorMessage}`)
        }
      }
      // For other errors, rethrow
      await auditLog({
        event: 'GA4_API_REQUEST_ERROR',
        userId: this.userId,
        details: `API request failed: ${errorMessage}`,
      })
      // Re-throw the original error or a new error wrapping it
      if (error instanceof Error) throw error
      throw new Error(errorMessage)
    }
  }

  async fetchReportData(propertyId: string, dateRange: DateRange): Promise<GA4ReportData> {
    if (!propertyId.startsWith('properties/')) {
      propertyId = `properties/${propertyId}`
    }

    const requestFunction = async (authClient: any) => {
      const analyticsData = google.analyticsdata({
        version: 'v1beta',
        auth: authClient,
      })

      await auditLog({
        event: 'GA4_FETCH_REPORT_DATA_START',
        userId: this.userId,
        details: `Fetching report data for property ${propertyId}, range: ${dateRange.startDate} to ${dateRange.endDate}`,
      })

      try {
        // This is a simplified example. A real report would likely involve multiple API calls
        // to gather all the data for the GA4ReportData interface.
        // For example, one for traffic, one for top pages, one for keywords (from GSC or GA4 if available)
        const response = await analyticsData.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
            metrics: [
              { name: 'totalUsers' },
              { name: 'newUsers' },
              { name: 'sessions' },
              { name: 'bounceRate' }, // bounceRate is sessions / engagedSessions
              { name: 'averageSessionDuration' },
              { name: 'conversions' }, // Standard 'conversion' event count
              { name: 'engagedSessions' }, // Needed for bounce rate if calculated manually
              { name: 'engagementRate' },
              { name: 'screenPageViews' },
              { name: 'screenPageViewsPerSession' },
            ],
            dimensions: [
              { name: 'sessionDefaultChannelGroup' }, // To filter by organic later
            ],
            // It's better to fetch raw data and process/filter for 'organic' in the backend
            // or use dimension filters if very specific.
            // dimensionFilter: {
            //   filter: {
            //     fieldName: "sessionDefaultChannelGroup",
            //     stringFilter: { matchType: "EXACT", value: "Organic Search" }
            //   }
            // }
          },
        })

        // TODO: Add separate calls for topKeywords and topPages with relevant dimensions and metrics
        // Example for top pages:
        // const topPagesResponse = await analyticsData.properties.runReport({ ... dimensions: [{name: 'pagePath'}], metrics: [{name: 'sessions'}, {name: 'engagementRate'}] ...});
        // Example for top keywords (if using GA4 for this, limited):
        // const topKeywordsResponse = await analyticsData.properties.runReport({ ... dimensions: [{name: 'searchTerm'}], metrics: [{name: 'sessions'}] ...});
        // Note: GA4 has limited keyword data. Google Search Console is the primary source for organic keywords.
        // The GA4ReportData interface includes GSC-like fields for keywords (clicks, impressions, ctr, position).
        // This implies an integration with GSC might be needed, or these fields will be mostly undefined/null from GA4.

        // Use imported processing function
        const processedData = processReportResponse(response.data /*, dateRange - if needed */)

        await auditLog({
          event: 'GA4_FETCH_REPORT_DATA_SUCCESS',
          userId: this.userId,
          details: `Successfully fetched report data for property ${propertyId}`,
        })
        return processedData
      } catch (error: any) {
        console.error('Error fetching GA4 report data:', error.message)
        await auditLog({
          event: 'GA4_FETCH_REPORT_DATA_ERROR',
          userId: this.userId,
          details: `Error fetching report data for ${propertyId}: ${error.message}`,
        })
        throw error // Rethrow to be caught by runRequestWithRetry or the caller
      }
    }

    return this.runRequestWithRetry(requestFunction)
  }

  // --- Methods for specific data points (Top Keywords, Top Pages) ---
  // These would be new methods, e.g., fetchTopPages, fetchTopKeywords

  async fetchTopPages(
    propertyId: string,
    dateRange: DateRange,
    limit: number = 10
  ): Promise<
    Array<{
      pagePath: string
      pageTitle?: string
      sessions: number
      engagementRate?: number
      conversions?: number
    }>
  > {
    if (!propertyId.startsWith('properties/')) {
      propertyId = `properties/${propertyId}`
    }

    const requestFunction = async (authClient: any) => {
      const analyticsData = google.analyticsdata({ version: 'v1beta', auth: authClient })
      await auditLog({
        event: 'GA4_FETCH_TOP_PAGES_START',
        userId: this.userId,
        details: `Property ${propertyId}`,
      })
      const response = await analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
          dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
          metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'conversions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: limit,
        },
      })
      await auditLog({
        event: 'GA4_FETCH_TOP_PAGES_SUCCESS',
        userId: this.userId,
        details: `Property ${propertyId}`,
      })
      return processTopPagesResponse(response.data) // Use imported function
    }
    return this.runRequestWithRetry(requestFunction)
  }

  async fetchTopKeywords(
    propertyId: string,
    dateRange: DateRange,
    limit: number = 10
  ): Promise<Array<{ keyword: string; sessions?: number }>> {
    // NOTE: Organic keyword data in GA4 is very limited ("(not provided)")
    // This method shows how to query for 'sessionManualTerm' or 'firstUserManualTerm' (UTM term)
    // or 'searchTerm' (from internal site search, if configured)
    // True organic keywords are best sourced from Google Search Console.
    // The GA4ReportData interface has fields (clicks, impressions, ctr, position) that align with GSC.
    // This function will only provide keywords GA4 *does* have, likely not organic search terms.
    if (!propertyId.startsWith('properties/')) {
      propertyId = `properties/${propertyId}`
    }

    const requestFunction = async (authClient: any) => {
      const analyticsData = google.analyticsdata({ version: 'v1beta', auth: authClient })
      await auditLog({
        event: 'GA4_FETCH_TOP_KEYWORDS_START',
        userId: this.userId,
        details: `Property ${propertyId}`,
      })
      // Try 'sessionManualTerm' (utm_term) or 'firstUserManualTerm'
      // 'searchUsage' with 'searchTerm' for internal site search
      const response = await analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
          dimensions: [{ name: 'sessionManualTerm' }], // or 'firstUserManualTerm' or 'searchTerm'
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: limit,
          dimensionFilter: {
            // Filter out empty/not set terms
            filter: {
              fieldName: 'sessionManualTerm',
              stringFilter: { matchType: 'FULL_REGEXP', value: '.+' }, // Matches non-empty strings
            },
          },
        },
      })
      await auditLog({
        event: 'GA4_FETCH_TOP_KEYWORDS_SUCCESS',
        userId: this.userId,
        details: `Property ${propertyId}`,
      })
      return processTopKeywordsResponse(response.data) // Use imported function
    }
    return this.runRequestWithRetry(requestFunction)
  }

  // Main method to orchestrate fetching all data for the GA4ReportData interface
  async fetchComprehensiveReportData(
    propertyId: string,
    dateRange: DateRange
  ): Promise<GA4ReportData> {
    // Fetch general metrics
    // The current `fetchReportData` fetches general metrics and does organic filtering.
    // We need to ensure it returns the overall structure, then fill in topPages/topKeywords.
    const baseData = await this.fetchReportData(propertyId, dateRange) // This already tries to get organicTraffic/Sessions

    // Fetch top pages
    const topPagesData = await this.fetchTopPages(propertyId, dateRange)
    baseData.topPages = topPagesData

    // Fetch top keywords (from GA4 - limited usefulness for organic SEO)
    const topKeywordsData = await this.fetchTopKeywords(propertyId, dateRange)
    // The GA4ReportData.topKeywords expects GSC like structure.
    // We map what we have from GA4 (keyword, sessions) to it. Other fields will be undefined.
    baseData.topKeywords = topKeywordsData.map(kw => ({
      keyword: kw.keyword,
      sessions: kw.sessions,
      // clicks, impressions, ctr, position would come from GSC
    }))

    // Potentially fetch other specific data points if needed for GA4ReportData

    return baseData
  }

  // --- Google Analytics Admin API Methods ---

  async listAccountSummaries(): Promise<analyticsadmin_v1alpha.Schema$GoogleAnalyticsAdminV1alphaListAccountSummariesResponse> {
    // Pass the execution context to the helper
    return ga4AdminHelpers.listAccountSummaries({
      userId: this.userId,
      runRequestWithRetry: this.runRequestWithRetry.bind(this), // Bind `this` if runRequestWithRetry uses `this` context from GA4Service
    })
  }

  public async getFormattedPropertiesList(): Promise<
    Array<{
      accountName: string
      accountId: string
      propertyName: string
      propertyId: string
      measurementId?: string
    }>
  > {
    return ga4AdminHelpers.getFormattedPropertiesList({
      userId: this.userId,
      runRequestWithRetry: this.runRequestWithRetry.bind(this),
    })
  }
}

// Example Usage (conceptual, would be in another file/service)
// async function generateUserReport(userId: string, propertyId: string, dateRange: DateRange) {
//   try {
//     // In a real app, initialAccessToken would be fetched securely for the user
//     // or the service would handle fetching it internally using a more robust getAccessTokenForUser.
//     const ga4Service = new GA4Service(userId, "USER_ACCESS_TOKEN_HERE_OR_NULL");
//     const reportData = await ga4Service.fetchComprehensiveReportData(propertyId, dateRange);
//     console.log("GA4 Report Data:", reportData);
//     // ... then generate PDF/HTML report
//   } catch (error) {
//     console.error("Failed to generate user report:", error);
//   }
// }

import {
  processReportResponse,
  processTopPagesResponse,
  processTopKeywordsResponse,
} from './ga4-report-processor'
import * as ga4AdminHelpers from '@/lib/ga4-admin-helpers' // Import new admin helpers

// Placeholder for auditLog if not already globally defined by auth route (for standalone testing)
// @ts-ignore
global.auditLog =
  global.auditLog || (async (log: any) => console.log('AUDIT_LOG (placeholder GA4Service):', log))
// Placeholder for refreshAccessTokenFinal if not already globally defined (for standalone testing)
// @ts-ignore
global.refreshAccessTokenFinal =
  global.refreshAccessTokenFinal ||
  (async (userId: string) => {
    console.warn(
      `refreshAccessTokenFinal (placeholder GA4Service) called for ${userId}. Returning null.`
    )
    return null
  })
