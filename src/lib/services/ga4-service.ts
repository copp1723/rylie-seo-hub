// src/lib/services/ga4-service.ts

import { google, analyticsdata_v1beta, analyticsadmin_v1alpha } from 'googleapis'; // Added analyticsadmin_v1alpha
import { auditLog } from '@/lib/services/audit-service'; // Assuming audit-service.ts exports this
import { refreshAccessTokenFinal } from '@/app/api/ga4/auth/route'; // Import the refresh function

// --- Interfaces ---

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface GA4ReportData {
  organicTraffic: number;
  organicSessions: number;
  // Standard Reports:
  totalUsers?: number;
  newUsers?: number;
  sessions?: number;
  averageSessionDuration?: string; // Formatted string like "00:05:30"
  bounceRate?: number; // Percentage e.g. 0.45 for 45%
  conversions?: number; // Specific to GA4 "conversions" event
  // SEO Specific:
  topKeywords: Array<{ keyword: string; clicks?: number; impressions?: number; ctr?: number; position?: number; sessions?: number }>; // Sessions for GA4, others from GSC
  topPages: Array<{ pagePath: string; pageTitle?: string; sessions: number; engagementRate?: number; conversions?: number }>; // GA4 metrics
  goalCompletions?: number; // This might be redundant if 'conversions' covers it, or map to specific conversion events.
  // Additional useful metrics
  sessionsPerUser?: number;
  screenPageViews?: number;
  screenPageViewsPerSession?: number;
  engagementRate?: number; // Overall engagement rate
}

// Helper to get the OAuth2 client
// In a real app, the userId would be known, and you'd fetch their specific tokens.
// For now, this is simplified. The GA4Service instance would likely be created
// in a context where userId and their tokens are available.
async function getAuthenticatedClient(userId: string, accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
    // No redirect URI needed for API calls once tokens are obtained
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
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
  console.warn(`getAccessTokenForUser for ${userId} is a placeholder. Returning dummy token.`);
  // This function needs a proper implementation to fetch and manage tokens.
  // For now, let's assume the caller of GA4Service methods will provide a valid token,
  // or the refresh mechanism will handle it.
  return "dummy-access-token"; // Placeholder
}


export class GA4Service {
  private userId: string;
  private accessToken: string | null; // Current access token for the user

  constructor(userId: string, initialAccessToken?: string) {
    this.userId = userId;
    this.accessToken = initialAccessToken || null;
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error("GA4Service: Google OAuth client credentials are not configured.");
        throw new Error("Google OAuth client credentials are not configured.");
    }
  }

  private async getValidAccessToken(): Promise<string> {
    if (!this.accessToken) {
      // Attempt to fetch it if not provided initially (e.g. from DB)
      // This part needs a robust implementation, likely involving `getTokensFinal` from auth route,
      // then decryption. For now, it's simplified.
      const fetchedToken = await getAccessTokenForUser(this.userId); // Placeholder
      if (!fetchedToken) {
        await auditLog({ event: 'GA4_ACCESS_TOKEN_MISSING', userId: this.userId, details: 'Access token not available and could not be fetched.' });
        throw new Error('Access token not available for GA4 service.');
      }
      this.accessToken = fetchedToken;
    }
    // If token exists, it might be expired. The actual API call will determine this.
    // The `runRequestWithRetry` method handles token refresh on auth errors.
    return this.accessToken;
  }

  private async runRequestWithRetry<T>(
    requestFn: (authClient: any) => Promise<T>,
    attempt = 1
  ): Promise<T> {
    if (attempt > 2) { // Allow one retry after token refresh
      await auditLog({ event: 'GA4_API_REQUEST_FAILED_MAX_RETRIES', userId: this.userId, details: 'GA4 API request failed after token refresh and retry.' });
      throw new Error('GA4 API request failed after multiple retries.');
    }

    try {
      const token = await this.getValidAccessToken();
      const authClient = await getAuthenticatedClient(this.userId, token);
      return await requestFn(authClient);
    } catch (error: any) {
      // Check if the error is due to an expired/invalid token (typically status 401 or 403)
      if (error.code === 401 || (error.code === 403 && error.message.includes('auth'))) { // Simplified check
        await auditLog({ event: 'GA4_ACCESS_TOKEN_EXPIRED_OR_INVALID', userId: this.userId, details: `Attempt: ${attempt}. Refreshing token.` });
        try {
          const newAccessToken = await refreshAccessTokenFinal(this.userId);
          if (!newAccessToken) {
            await auditLog({ event: 'GA4_TOKEN_REFRESH_NO_NEW_TOKEN', userId: this.userId, details: 'Refresh token flow did not return a new access token.' });
            throw new Error('Failed to refresh access token, no new token returned.');
          }
          this.accessToken = newAccessToken; // Update the stored access token
          await auditLog({ event: 'GA4_ACCESS_TOKEN_REFRESHED_SUCCESS_SERVICE', userId: this.userId, details: 'Access token refreshed successfully, retrying API call.' });
          return this.runRequestWithRetry(requestFn, attempt + 1); // Retry the request
        } catch (refreshError: any) {
          await auditLog({ event: 'GA4_TOKEN_REFRESH_FAILED_SERVICE', userId: this.userId, details: `Failed to refresh token: ${refreshError.message}` });
          throw new Error(`Failed to refresh GA4 access token: ${refreshError.message}`);
        }
      }
      // For other errors, rethrow
      await auditLog({ event: 'GA4_API_REQUEST_ERROR', userId: this.userId, details: `API request failed: ${error.message}` });
      throw error;
    }
  }

  async fetchReportData(propertyId: string, dateRange: DateRange): Promise<GA4ReportData> {
    if (!propertyId.startsWith('properties/')) {
        propertyId = `properties/${propertyId}`;
    }

    const requestFunction = async (authClient: any) => {
      const analyticsData = google.analyticsdata({
        version: 'v1beta',
        auth: authClient,
      });

      await auditLog({
        event: 'GA4_FETCH_REPORT_DATA_START',
        userId: this.userId,
        details: `Fetching report data for property ${propertyId}, range: ${dateRange.startDate} to ${dateRange.endDate}`,
      });

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
        });

        // TODO: Add separate calls for topKeywords and topPages with relevant dimensions and metrics
        // Example for top pages:
        // const topPagesResponse = await analyticsData.properties.runReport({ ... dimensions: [{name: 'pagePath'}], metrics: [{name: 'sessions'}, {name: 'engagementRate'}] ...});
        // Example for top keywords (if using GA4 for this, limited):
        // const topKeywordsResponse = await analyticsData.properties.runReport({ ... dimensions: [{name: 'searchTerm'}], metrics: [{name: 'sessions'}] ...});
        // Note: GA4 has limited keyword data. Google Search Console is the primary source for organic keywords.
        // The GA4ReportData interface includes GSC-like fields for keywords (clicks, impressions, ctr, position).
        // This implies an integration with GSC might be needed, or these fields will be mostly undefined/null from GA4.

        const processedData = this.processReportResponse(response.data, dateRange);

        await auditLog({
          event: 'GA4_FETCH_REPORT_DATA_SUCCESS',
          userId: this.userId,
          details: `Successfully fetched report data for property ${propertyId}`,
        });
        return processedData;

      } catch (error: any) {
        console.error('Error fetching GA4 report data:', error.message);
        await auditLog({
          event: 'GA4_FETCH_REPORT_DATA_ERROR',
          userId: this.userId,
          details: `Error fetching report data for ${propertyId}: ${error.message}`,
        });
        throw error; // Rethrow to be caught by runRequestWithRetry or the caller
      }
    };

    return this.runRequestWithRetry(requestFunction);
  }

  private processReportResponse(
    report: analyticsdata_v1beta.Schema$RunReportResponse,
    dateRange: DateRange // Keep for context if needed later
  ): GA4ReportData {
    // Initialize with default values
    const result: GA4ReportData = {
      organicTraffic: 0, // Will be sum of users from organic sources
      organicSessions: 0,
      totalUsers: 0,
      newUsers: 0,
      sessions: 0,
      averageSessionDuration: "00:00:00",
      bounceRate: 0,
      conversions: 0,
      topKeywords: [], // Placeholder, requires different query or GSC data
      topPages: [],    // Placeholder, requires different query
      goalCompletions: 0, // Map to specific conversion events if necessary
      sessionsPerUser: 0,
      screenPageViews: 0,
      screenPageViewsPerSession: 0,
      engagementRate: 0,
    };

    if (!report.rows || report.rows.length === 0) {
      console.warn("GA4 processReportResponse: No rows in report data.");
      // Return default/empty data, or data from summary row if available
      if(report.totals && report.totals.length > 0) {
        const totalRow = report.totals[0]; // Assuming one total row for the date range
        const metricValues = totalRow.metricValues || [];
        report.metricHeaders?.forEach((header, index) => {
            const value = metricValues[index]?.value;
            if (value) {
                this.mapMetricToResult(result, header.name!, value, true); // true for total aggregates
            }
        });
      }
      return result;
    }

    // Aggregate metrics from all rows first (overall site performance)
    // The query included 'sessionDefaultChannelGroup', so rows are per channel.
    // We need to sum these up for totals, and then isolate 'Organic Search'.

    report.rows.forEach(row => {
        const dimensionValues = row.dimensionValues || [];
        const metricValues = row.metricValues || [];
        const channelGroup = dimensionValues[0]?.value; // Assuming 'sessionDefaultChannelGroup' is the first dimension

        let isOrganic = channelGroup === 'Organic Search';

        report.metricHeaders?.forEach((header, index) => {
            const value = metricValues[index]?.value;
            if (value) {
                this.mapMetricToResult(result, header.name!, value, true, isOrganic);
            }
        });
    });

    // Post-processing for calculated metrics if not directly available or need adjustment
    if (result.sessions && result.totalUsers && result.totalUsers > 0) {
        result.sessionsPerUser = parseFloat((result.sessions / result.totalUsers).toFixed(2));
    }
    if (result.sessions && result.screenPageViews && result.sessions > 0) {
        result.screenPageViewsPerSession = parseFloat((result.screenPageViews / result.sessions).toFixed(2));
    }
    // The API provides bounceRate and engagementRate directly for GA4.
    // If bounceRate needed calculation: engagedSessions / sessions; bounceRate = 1 - engagementRate

    // Note: TopKeywords and TopPages would be populated from different API calls
    // and processed separately. This basic `runReport` example focuses on aggregate metrics.
    // For now, they remain empty arrays.

    return result;
  }

  private mapMetricToResult(
    result: GA4ReportData,
    metricName: string,
    value: string,
    isAggregation: boolean, // True if this value should be added to an existing total
    isOrganicSource: boolean = false // True if the current row/data point is from organic search
  ) {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    switch (metricName) {
      case 'totalUsers':
        result.totalUsers = (isAggregation && result.totalUsers) ? result.totalUsers + numValue : numValue;
        if (isOrganicSource) {
            result.organicTraffic = (isAggregation && result.organicTraffic) ? result.organicTraffic + numValue : numValue;
        }
        break;
      case 'newUsers':
        result.newUsers = (isAggregation && result.newUsers) ? result.newUsers + numValue : numValue;
        break;
      case 'sessions':
        result.sessions = (isAggregation && result.sessions) ? result.sessions + numValue : numValue;
        if (isOrganicSource) {
            result.organicSessions = (isAggregation && result.organicSessions) ? result.organicSessions + numValue : numValue;
        }
        break;
      case 'averageSessionDuration':
        // API returns seconds. Format as HH:MM:SS or store as seconds.
        // Let's assume we store it as a formatted string for now, if it's an aggregation, this is tricky.
        // For simplicity, if it's an aggregate value from 'totals' row, we take it.
        // If summing up, average session duration needs weighted average, not simple sum.
        // The API's 'totals' row usually gives the correct overall average.
        if (!isAggregation || (isAggregation && !result.averageSessionDuration) || result.averageSessionDuration === "00:00:00") {
            const totalSeconds = Math.round(numValue);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            result.averageSessionDuration =
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        break;
      case 'bounceRate': // GA4 provides this directly
        result.bounceRate = numValue; // This is usually an average, not summed. Take from totals row or if only one data point.
        break;
      case 'engagementRate': // GA4 provides this directly
        result.engagementRate = numValue; // Average, not summed.
        break;
      case 'conversions':
        result.conversions = (isAggregation && result.conversions) ? result.conversions + numValue : numValue;
        // goalCompletions could be mapped here or to specific conversion events if the query was more granular.
        // For now, let's make them the same if not specified otherwise.
        result.goalCompletions = result.conversions;
        break;
      case 'screenPageViews':
        result.screenPageViews = (isAggregation && result.screenPageViews) ? result.screenPageViews + numValue : numValue;
        break;
      // 'screenPageViewsPerSession' and 'sessionsPerUser' are calculated post-aggregation.
      // 'engagedSessions' is used if calculating bounce/engagement rate manually.
    }
  }

  // --- Methods for specific data points (Top Keywords, Top Pages) ---
  // These would be new methods, e.g., fetchTopPages, fetchTopKeywords

  async fetchTopPages(propertyId: string, dateRange: DateRange, limit: number = 10): Promise<Array<{ pagePath: string; pageTitle?: string; sessions: number; engagementRate?: number; conversions?: number }>> {
    if (!propertyId.startsWith('properties/')) {
        propertyId = `properties/${propertyId}`;
    }

    const requestFunction = async (authClient: any) => {
        const analyticsData = google.analyticsdata({ version: 'v1beta', auth: authClient });
        await auditLog({ event: 'GA4_FETCH_TOP_PAGES_START', userId: this.userId, details: `Property ${propertyId}`});
        const response = await analyticsData.properties.runReport({
            property: propertyId,
            requestBody: {
                dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
                dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
                metrics: [
                    { name: 'sessions' },
                    { name: 'engagementRate' },
                    { name: 'conversions' },
                ],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: limit,
            },
        });
        await auditLog({ event: 'GA4_FETCH_TOP_PAGES_SUCCESS', userId: this.userId, details: `Property ${propertyId}`});
        return this.processTopPagesResponse(response.data);
    };
    return this.runRequestWithRetry(requestFunction);
  }

  private processTopPagesResponse(report: analyticsdata_v1beta.Schema$RunReportResponse): Array<{ pagePath: string; pageTitle?: string; sessions: number; engagementRate?: number; conversions?: number }> {
    const pages: Array<{ pagePath: string; pageTitle?: string; sessions: number; engagementRate?: number; conversions?: number }> = [];
    if (!report.rows) return pages;

    report.rows.forEach(row => {
        const pagePath = row.dimensionValues?.[0]?.value || '(not set)';
        const pageTitle = row.dimensionValues?.[1]?.value || '(not set)';
        const sessions = parseFloat(row.metricValues?.[0]?.value || '0');
        const engagementRate = parseFloat(row.metricValues?.[1]?.value || '0');
        const conversions = parseFloat(row.metricValues?.[2]?.value || '0');
        pages.push({ pagePath, pageTitle, sessions, engagementRate, conversions });
    });
    return pages;
  }

  async fetchTopKeywords(propertyId: string, dateRange: DateRange, limit: number = 10): Promise<Array<{ keyword: string; sessions?: number }>> {
    // NOTE: Organic keyword data in GA4 is very limited ("(not provided)")
    // This method shows how to query for 'sessionManualTerm' or 'firstUserManualTerm' (UTM term)
    // or 'searchTerm' (from internal site search, if configured)
    // True organic keywords are best sourced from Google Search Console.
    // The GA4ReportData interface has fields (clicks, impressions, ctr, position) that align with GSC.
    // This function will only provide keywords GA4 *does* have, likely not organic search terms.
    if (!propertyId.startsWith('properties/')) {
        propertyId = `properties/${propertyId}`;
    }

    const requestFunction = async (authClient: any) => {
        const analyticsData = google.analyticsdata({ version: 'v1beta', auth: authClient });
        await auditLog({ event: 'GA4_FETCH_TOP_KEYWORDS_START', userId: this.userId, details: `Property ${propertyId}`});
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
                dimensionFilter: { // Filter out empty/not set terms
                    filter: {
                        fieldName: "sessionManualTerm",
                        stringFilter: { matchType: "FULL_REGEXP", value: ".+" } // Matches non-empty strings
                    }
                }
            },
        });
        await auditLog({ event: 'GA4_FETCH_TOP_KEYWORDS_SUCCESS', userId: this.userId, details: `Property ${propertyId}`});
        return this.processTopKeywordsResponse(response.data);
    };
    return this.runRequestWithRetry(requestFunction);
  }

    private processTopKeywordsResponse(report: analyticsdata_v1beta.Schema$RunReportResponse): Array<{ keyword: string; sessions?: number }> {
        const keywords: Array<{ keyword: string; sessions?: number }> = [];
        if (!report.rows) return keywords;

        report.rows.forEach(row => {
            const keyword = row.dimensionValues?.[0]?.value || '(not set)';
            // Filter out common non-keywords if necessary, though the dimensionFilter should handle "(not set)"
            if (keyword && keyword.toLowerCase() !== '(not set)' && keyword.toLowerCase() !== '(not provided)') {
                 const sessions = parseFloat(row.metricValues?.[0]?.value || '0');
                 keywords.push({ keyword, sessions });
            }
        });
        return keywords;
    }

  // Main method to orchestrate fetching all data for the GA4ReportData interface
  async fetchComprehensiveReportData(propertyId: string, dateRange: DateRange): Promise<GA4ReportData> {
    // Fetch general metrics
    // The current `fetchReportData` fetches general metrics and does organic filtering.
    // We need to ensure it returns the overall structure, then fill in topPages/topKeywords.
    const baseData = await this.fetchReportData(propertyId, dateRange); // This already tries to get organicTraffic/Sessions

    // Fetch top pages
    const topPagesData = await this.fetchTopPages(propertyId, dateRange);
    baseData.topPages = topPagesData;

    // Fetch top keywords (from GA4 - limited usefulness for organic SEO)
    const topKeywordsData = await this.fetchTopKeywords(propertyId, dateRange);
    // The GA4ReportData.topKeywords expects GSC like structure.
    // We map what we have from GA4 (keyword, sessions) to it. Other fields will be undefined.
    baseData.topKeywords = topKeywordsData.map(kw => ({
        keyword: kw.keyword,
        sessions: kw.sessions,
        // clicks, impressions, ctr, position would come from GSC
    }));

    // Potentially fetch other specific data points if needed for GA4ReportData

    return baseData;
  }

  // --- Google Analytics Admin API Methods ---

  async listAccountSummaries(): Promise<analyticsadmin_v1alpha.Schema$GoogleAnalyticsAdminV1alphaListAccountSummariesResponse> {
    const requestFunction = async (authClient: any) => {
      const analyticsAdmin = google.analyticsadmin({
        version: 'v1alpha',
        auth: authClient,
      });

      await auditLog({
        event: 'GA_ADMIN_LIST_ACCOUNT_SUMMARIES_START',
        userId: this.userId,
        details: 'Fetching GA account summaries.',
      });

      try {
        // The Admin API's listAccountSummaries can paginate.
        // This example fetches the first page. A robust implementation
        // would handle pagination to get all summaries if needed.
        const response = await analyticsAdmin.accountSummaries.list({
          // pageSize: 200, // Adjust as needed
        });

        await auditLog({
          event: 'GA_ADMIN_LIST_ACCOUNT_SUMMARIES_SUCCESS',
          userId: this.userId,
          details: `Successfully fetched account summaries. Count: ${response.data.accountSummaries?.length || 0}`,
        });
        return response.data;
      } catch (error: any) {
        console.error('Error fetching GA account summaries:', error.message);
        await auditLog({
          event: 'GA_ADMIN_LIST_ACCOUNT_SUMMARIES_ERROR',
          userId: this.userId,
          details: `Error fetching account summaries: ${error.message}`,
        });
        throw error; // Rethrow to be caught by runRequestWithRetry or the caller
      }
    };
    return this.runRequestWithRetry(requestFunction);
  }

  // Helper to extract a more user-friendly list of properties
  public async getFormattedPropertiesList(): Promise<Array<{ accountName: string; accountId: string; propertyName: string; propertyId: string; measurementId?: string }>> {
    const summaries = await this.listAccountSummaries();
    const propertiesList: Array<{ accountName: string; accountId: string; propertyName: string; propertyId: string; measurementId?: string }> = [];

    if (summaries.accountSummaries) {
      for (const accountSummary of summaries.accountSummaries) {
        if (accountSummary.propertySummaries) {
          for (const propertySummary of accountSummary.propertySummaries) {
            // propertySummaries directly give GA4 properties
            let measurementId: string | undefined = undefined;
            // To get measurement ID, we might need another call if not directly in summary,
            // or it might be part of a stream lookup.
            // For GA4 properties listed under accountSummaries, the `property` field is like "properties/12345"
            // and `displayName` is the property name.
            // Measurement ID is associated with a Data Stream within the property.
            // A property can have multiple streams. Typically, one web stream.
            // For simplicity, we'll leave measurementId blank here, as fetching it requires
            // listing data streams for each property: `analyticsAdmin.properties.dataStreams.list({parent: propertySummary.property})`

            propertiesList.push({
              accountName: accountSummary.displayName || `Account ${accountSummary.account?.split('/')[1]}`,
              accountId: accountSummary.account?.split('/')[1] || 'N/A',
              propertyName: propertySummary.displayName || `Property ${propertySummary.property?.split('/')[1]}`,
              propertyId: propertySummary.property?.split('/')[1] || 'N/A', // This is the ID like "12345678"
              // measurementId: "G-XXXXXXXXXX" // Would require fetching data streams
            });
          }
        }
      }
    }
    return propertiesList;
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

// Placeholder for auditLog if not already globally defined by auth route (for standalone testing)
// @ts-ignore
global.auditLog = global.auditLog || (async (log: any) => console.log("AUDIT_LOG (placeholder GA4Service):", log));
// Placeholder for refreshAccessTokenFinal if not already globally defined (for standalone testing)
// @ts-ignore
global.refreshAccessTokenFinal = global.refreshAccessTokenFinal || (async (userId: string) => {
  console.warn(`refreshAccessTokenFinal (placeholder GA4Service) called for ${userId}. Returning null.`);
  return null;
});
