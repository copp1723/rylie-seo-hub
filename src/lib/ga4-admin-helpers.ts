// src/lib/ga4-admin-helpers.ts

import { google, analyticsadmin_v1alpha } from 'googleapis'
import { auditLog } from '@/lib/services/audit-service'

// Define a type for the execution context needed from GA4Service
// This is a simplified approach. A more robust solution might involve a shared base class
// or a more formal dependency injection for the authenticated client / request retry logic.
type GA4APIExecutionContext = {
  userId: string
  runRequestWithRetry: <T>(requestFn: (authClient: any) => Promise<T>) => Promise<T>
}

export async function listAccountSummaries(
  context: GA4APIExecutionContext
): Promise<analyticsadmin_v1alpha.Schema$GoogleAnalyticsAdminV1alphaListAccountSummariesResponse> {
  const requestFunction = async (authClient: any) => {
    // authClient here is the google.auth.OAuth2 instance provided by runRequestWithRetry
    const analyticsAdmin = google.analyticsadmin({
      version: 'v1alpha',
      auth: authClient,
    })

    await auditLog({
      event: 'GA_ADMIN_LIST_ACCOUNT_SUMMARIES_START',
      userId: context.userId,
      details: 'Fetching GA account summaries (helper).',
    })

    try {
      const response = await analyticsAdmin.accountSummaries.list({
        // pageSize: 200, // Adjust as needed for pagination
      })

      await auditLog({
        event: 'GA_ADMIN_LIST_ACCOUNT_SUMMARIES_SUCCESS',
        userId: context.userId,
        details: `Successfully fetched account summaries. Count: ${response.data.accountSummaries?.length || 0}`,
      })
      return response.data // runRequestWithRetry expects the actual data, not the full Axios-like response
    } catch (error: any) {
      console.error('Error fetching GA account summaries (helper):', error.message)
      await auditLog({
        event: 'GA_ADMIN_LIST_ACCOUNT_SUMMARIES_ERROR',
        userId: context.userId,
        details: `Error fetching account summaries (helper): ${error.message}`,
      })
      throw error
    }
  }
  return context.runRequestWithRetry(requestFunction)
}

export async function getFormattedPropertiesList(context: GA4APIExecutionContext): Promise<
  Array<{
    accountName: string
    accountId: string
    propertyName: string
    propertyId: string
    measurementId?: string
  }>
> {
  const summaries = await listAccountSummaries(context) // Use the helper above
  const propertiesList: Array<{
    accountName: string
    accountId: string
    propertyName: string
    propertyId: string
    measurementId?: string
  }> = []

  if (summaries.accountSummaries) {
    for (const accountSummary of summaries.accountSummaries) {
      if (accountSummary.propertySummaries) {
        for (const propertySummary of accountSummary.propertySummaries) {
          propertiesList.push({
            accountName:
              accountSummary.displayName || `Account ${accountSummary.account?.split('/')[1]}`,
            accountId: accountSummary.account?.split('/')[1] || 'N/A',
            propertyName:
              propertySummary.displayName || `Property ${propertySummary.property?.split('/')[1]}`,
            propertyId: propertySummary.property?.split('/')[1] || 'N/A',
            // measurementId: "G-XXXXXXXXXX" // Still requires fetching data streams
          })
        }
      }
    }
  }
  return propertiesList
}
