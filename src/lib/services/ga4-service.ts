// src/lib/services/ga4-service.ts

import { google, analyticsdata_v1beta, analyticsadmin_v1alpha } from 'googleapis';
import { OAuth2Client } from 'google-auth-library'; // More specific import for auth
// import { auditLog } from '@/lib/services/audit-service' // Assuming audit-service.ts exports this // Removed audit-service import
// import { refreshAccessTokenFinal } from '@/app/api/ga4/auth/route' // Import the refresh function // Replaced with getValidGoogleAccessToken
import { getValidGoogleAccessToken } from '@/lib/google-auth'; // Import the new function
import { DateRange, GA4ReportData } from '@/lib/types/ga4' // Import extracted types

// Define a type for the placeholder auditLog function
type AuditLogFn = (log: any) => Promise<void>;

// Helper to get the OAuth2 client
// In a real app, the userId would be known, and you'd fetch their specific tokens.
// For now, this is simplified. The GA4Service instance would likely be created
// in a context where userId and their tokens are available.
async function getAuthenticatedClient(userId: string, accessToken: string) {
  const oauth2Client = new OAuth2Client( // Use destructured import
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
  private auditLog: AuditLogFn; // Use the defined type

  constructor(userId: string, initialAccessToken?: string) {
    this.userId = userId
    this.accessToken = initialAccessToken || null
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('GA4Service: Google OAuth client credentials are not configured.')
      throw new Error('Google OAuth client credentials are not configured.')
    }
    // Assign the global or placeholder auditLog to the instance
    this.auditLog = (global as any).auditLog || (async (log: any) => console.log('AUDIT_LOG (GA4Service Instance):', log));
  }

  private async getValidAccessToken(): Promise<string> {
    if (!this.accessToken) {
      // Attempt to fetch it if not provided initially (e.g. from DB)
      // This part needs a robust implementation, likely involving `getTokensFinal` from auth route,
      // then decryption. For now, it's simplified.
      const fetchedToken = await getAccessTokenForUser(this.userId) // Placeholder
      if (!fetchedToken) {
        await this.auditLog({ // Use instance auditLog
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
    requestFn: (authClient: OAuth2Client) => Promise<T>, // Use destructured import type
    attempt = 1
  ): Promise<T> {
    if (attempt > 2) {
      // Allow one retry after token refresh
      await this.auditLog({ // Use instance auditLog
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
        await this.auditLog({ // Use instance auditLog
          event: 'GA4_ACCESS_TOKEN_EXPIRED_OR_INVALID',
          userId: this.userId,
          details: `Attempt: ${attempt}. Refreshing token. Error code: ${potentialGaxiosError.code}`,
        })
        try {
          // const newAccessToken = await refreshAccessTokenFinal(this.userId) // Old call
          const newAccessToken = await getValidGoogleAccessToken(this.userId); // New call
          if (!newAccessToken) {
            await this.auditLog({ // Use instance auditLog
              event: 'GA4_TOKEN_REFRESH_NO_NEW_TOKEN',
              userId: this.userId,
              details: 'Refresh token flow did not return a new access token.',
            })
            throw new Error('Failed to refresh access token, no new token returned.')
          }
          this.accessToken = newAccessToken // Update the stored access token
          await this.auditLog({ // Use instance auditLog
            event: 'GA4_ACCESS_TOKEN_REFRESHED_SUCCESS_SERVICE',
            userId: this.userId,
            details: 'Access token refreshed successfully, retrying API call.',
          })
          return this.runRequestWithRetry(requestFn, attempt + 1) // Retry the request
        } catch (refreshError: unknown) {
          const refreshErrorMessage =
            refreshError instanceof Error ? refreshError.message : String(refreshError)
          await this.auditLog({ // Use instance auditLog
            event: 'GA4_TOKEN_REFRESH_FAILED_SERVICE',
            userId: this.userId,
            details: `Failed to refresh token: ${refreshErrorMessage}`,
          })
          throw new Error(`Failed to refresh GA4 access token: ${refreshErrorMessage}`)
        }
      }
      // For other errors, rethrow
      await this.auditLog({ // Use instance auditLog
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

    const requestFunction = async (authClient: OAuth2Client) => {
      const analyticsData = new analyticsdata_v1beta.Analyticsdata({
        auth: authClient,
      });

      await this.auditLog({ // Use instance auditLog
        event: 'GA4_FETCH_REPORT_DATA_START',
        userId: this.userId,
        details: `Fetching report data for property ${propertyId}, range: ${dateRange.startDate} to ${dateRange.endDate}`,
      })

      try {
        const response = await analyticsData.properties.runReport({
          property: propertyId,
          requestBody: {
            dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
            metrics: [
              { name: 'totalUsers' },
              { name: 'newUsers' },
              { name: 'sessions' },
              { name: 'bounceRate' },
              { name: 'averageSessionDuration' },
              { name: 'conversions' },
              { name: 'engagedSessions' },
              { name: 'engagementRate' },
              { name: 'screenPageViews' },
              { name: 'screenPageViewsPerSession' },
            ],
            dimensions: [
              { name: 'sessionDefaultChannelGroup' },
            ],
          },
        })

        const processedData = processReportResponse(response.data /*, dateRange - if needed */)

        await this.auditLog({ // Use instance auditLog
          event: 'GA4_FETCH_REPORT_DATA_SUCCESS',
          userId: this.userId,
          details: `Successfully fetched report data for property ${propertyId}`,
        })
        return processedData
      } catch (error: any) {
        console.error('Error fetching GA4 report data:', error.message)
        await this.auditLog({ // Use instance auditLog
          event: 'GA4_FETCH_REPORT_DATA_ERROR',
          userId: this.userId,
          details: `Error fetching report data for ${propertyId}: ${error.message}`,
        })
        throw error
      }
    }

    return this.runRequestWithRetry(requestFunction)
  }

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

    const requestFunction = async (authClient: OAuth2Client) => {
      const analyticsData = new analyticsdata_v1beta.Analyticsdata({ auth: authClient });
      await this.auditLog({ // Use instance auditLog
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
          limit: String(limit), // Cast limit to string
        },
      })
      await this.auditLog({ // Use instance auditLog
        event: 'GA4_FETCH_TOP_PAGES_SUCCESS',
        userId: this.userId,
        details: `Property ${propertyId}`,
      })
      return processTopPagesResponse(response.data)
    }
    return this.runRequestWithRetry(requestFunction)
  }

  async fetchTopKeywords(
    propertyId: string,
    dateRange: DateRange,
    limit: number = 10
  ): Promise<Array<{ keyword: string; sessions?: number }>> {
    if (!propertyId.startsWith('properties/')) {
      propertyId = `properties/${propertyId}`
    }

    const requestFunction = async (authClient: OAuth2Client) => {
      const analyticsData = new analyticsdata_v1beta.Analyticsdata({ auth: authClient });
      await this.auditLog({ // Use instance auditLog
        event: 'GA4_FETCH_TOP_KEYWORDS_START',
        userId: this.userId,
        details: `Property ${propertyId}`,
      })
      const response = await analyticsData.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
          dimensions: [{ name: 'sessionManualTerm' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: String(limit), // Cast limit to string
          dimensionFilter: {
            filter: {
              fieldName: 'sessionManualTerm',
              stringFilter: { matchType: 'FULL_REGEXP', value: '.+' },
            },
          },
        },
      })
      await this.auditLog({ // Use instance auditLog
        event: 'GA4_FETCH_TOP_KEYWORDS_SUCCESS',
        userId: this.userId,
        details: `Property ${propertyId}`,
      })
      return processTopKeywordsResponse(response.data)
    }
    return this.runRequestWithRetry(requestFunction)
  }

  async fetchComprehensiveReportData(
    propertyId: string,
    dateRange: DateRange
  ): Promise<GA4ReportData> {
    const baseData = await this.fetchReportData(propertyId, dateRange)
    const topPagesData = await this.fetchTopPages(propertyId, dateRange)
    baseData.topPages = topPagesData
    const topKeywordsData = await this.fetchTopKeywords(propertyId, dateRange)
    baseData.topKeywords = topKeywordsData.map(kw => ({
      keyword: kw.keyword,
      sessions: kw.sessions,
    }))
    return baseData
  }

  async listAccountSummaries(): Promise<analyticsadmin_v1alpha.Schema$GoogleAnalyticsAdminV1alphaListAccountSummariesResponse> {
    return ga4AdminHelpers.listAccountSummaries({
      userId: this.userId,
      runRequestWithRetry: this.runRequestWithRetry.bind(this),
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

import {
  processReportResponse,
  processTopPagesResponse,
  processTopKeywordsResponse,
} from './ga4-report-processor'
import * as ga4AdminHelpers from '@/lib/ga4-admin-helpers'

// Placeholder for global auditLog and refreshAccessTokenFinal for standalone testing or if not set by auth routes
// @ts-ignore
if (!(global as any).auditLog) {
  // @ts-ignore
  (global as any).auditLog = async (log: any) => console.log('AUDIT_LOG (placeholder GA4Service Global):', log);
}
// @ts-ignore
// if (!(global as any).refreshAccessTokenFinal) { // Removed placeholder for refreshAccessTokenFinal
//   // @ts-ignore
//   (global as any).refreshAccessTokenFinal = async (userId: string) => {
//     console.warn(
//       `refreshAccessTokenFinal (placeholder GA4Service Global) called for ${userId}. Returning null.`
//     )
//     return null
//   };
// }

// Note: The local const auditLog was removed as it's now an instance property this.auditLog
// initialized from global or a placeholder. The error TS7017 was for the global.auditLog usage at the end of the file.
// Making it an instance property initialized from global is cleaner.Tool output for `overwrite_file_with_block`:
