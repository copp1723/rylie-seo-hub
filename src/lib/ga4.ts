import { google } from 'googleapis'
import { prisma } from './prisma'

export class GA4Service {
  private auth: any
  private analyticsdata: any
  private analytics: any
  private analyticsadmin: any

  constructor(accessToken?: string) {
    if (accessToken) {
      // OAuth access token
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      )
      this.auth.setCredentials({ access_token: accessToken })
    } else if (process.env.GA4_SERVICE_ACCOUNT_KEY) {
      // Service account
      const credentials = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY)
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      })
    } else {
      throw new Error('No authentication method available for GA4')
    }

    // Initialize Google APIs with auth
    this.analyticsdata = google.analyticsdata({ version: 'v1beta', auth: this.auth })
    this.analytics = google.analytics({ version: 'v3', auth: this.auth })
    this.analyticsadmin = google.analyticsadmin({ version: 'v1beta', auth: this.auth })
  }

  /**
   * List all GA4 properties the user has access to
   */
  async listProperties() {
    try {
      // First list all accounts the user has access to
      const accountsResponse = await this.analyticsadmin.accounts.list({})
      const accounts = accountsResponse.data.accounts || []

      if (accounts.length === 0) {
        console.log('No GA4 accounts found for user')
        return []
      }

      // List properties for each account
      const allProperties = []
      for (const account of accounts) {
        const propertiesResponse = await this.analyticsadmin.properties.list({
          filter: `parent:${account.name}`,
        })
        const properties = propertiesResponse.data.properties || []
        allProperties.push(...properties)
      }

      return allProperties
    } catch (error: any) {
      console.error('Error listing GA4 properties:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        errors: error.errors,
      })

      // Provide more specific error messages
      if (error.code === 401) {
        throw new Error('Authentication failed. Please reconnect your Google account.')
      } else if (error.code === 403) {
        throw new Error('Access denied. Please ensure you have granted analytics permissions.')
      } else if (error.message?.includes('Request had insufficient authentication scopes')) {
        throw new Error('Insufficient permissions. Please reconnect with analytics permissions.')
      }

      throw new Error(`Failed to list GA4 properties: ${error.message || 'Unknown error'}`)
    }
  }

  /**
   * Get SEO-related metrics from GA4
   */
  async getSEOMetrics(propertyId: string, dateRange = 'last30Days') {
    try {
      const response = await this.analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [this.getDateRange(dateRange)],
          dimensions: [
            { name: 'sessionDefaultChannelGroup' },
            { name: 'landingPagePlusQueryString' },
          ],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'sessionDefaultChannelGroup',
              stringFilter: {
                value: 'Organic Search',
              },
            },
          },
          orderBys: [
            {
              metric: {
                metricName: 'sessions',
              },
              desc: true,
            },
          ],
          limit: '50',
        },
      })

      return this.formatSEOMetrics(response.data)
    } catch (error) {
      console.error('Error fetching SEO metrics:', error)
      throw new Error('Failed to fetch SEO metrics')
    }
  }

  /**
   * Get search console data if available
   */
  async getSearchQueries(propertyId: string, dateRange = 'last30Days') {
    try {
      const response = await this.analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [this.getDateRange(dateRange)],
          dimensions: [{ name: 'googleSearchQuery' }, { name: 'googleSearchKeyword' }],
          metrics: [
            { name: 'googleSearchClicks' },
            { name: 'googleSearchImpressions' },
            { name: 'googleSearchClickThroughRate' },
            { name: 'googleSearchAveragePosition' },
          ],
          orderBys: [
            {
              metric: {
                metricName: 'googleSearchClicks',
              },
              desc: true,
            },
          ],
          limit: '20',
        },
      })

      return this.formatSearchQueries(response.data)
    } catch (error) {
      console.error('Error fetching search queries:', error)
      // Return empty array if Search Console isn't linked
      return []
    }
  }

  /**
   * Get top landing pages from organic search
   */
  async getTopPages(propertyId: string, dateRange = 'last30Days') {
    try {
      const response = await this.analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [this.getDateRange(dateRange)],
          dimensions: [{ name: 'landingPagePlusQueryString' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'sessionDefaultChannelGroup',
              stringFilter: {
                value: 'Organic Search',
              },
            },
          },
          orderBys: [
            {
              metric: {
                metricName: 'sessions',
              },
              desc: true,
            },
          ],
          limit: '10',
        },
      })

      return this.formatTopPages(response.data)
    } catch (error) {
      console.error('Error fetching top pages:', error)
      throw new Error('Failed to fetch top pages')
    }
  }

  /**
   * Helper to generate date ranges
   */
  private getDateRange(dateRange: string) {
    const today = new Date()
    const startDate = new Date()

    switch (dateRange) {
      case 'last7Days':
        startDate.setDate(today.getDate() - 7)
        break
      case 'last30Days':
        startDate.setDate(today.getDate() - 30)
        break
      case 'last90Days':
        startDate.setDate(today.getDate() - 90)
        break
      default:
        startDate.setDate(today.getDate() - 30)
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    }
  }

  /**
   * Format SEO metrics response
   */
  private formatSEOMetrics(data: any) {
    if (!data.rows || data.rows.length === 0) {
      return {
        totalSessions: 0,
        totalUsers: 0,
        avgBounceRate: 0,
        avgSessionDuration: 0,
        topPages: [],
      }
    }

    const metrics = data.rows.reduce(
      (acc: any, row: any) => {
        acc.totalSessions += parseInt(row.metricValues[0].value)
        acc.totalUsers += parseInt(row.metricValues[1].value)
        acc.bounceRates.push(parseFloat(row.metricValues[2].value))
        acc.sessionDurations.push(parseFloat(row.metricValues[3].value))
        acc.pages.push({
          page: row.dimensionValues[1].value,
          sessions: parseInt(row.metricValues[0].value),
          users: parseInt(row.metricValues[1].value),
          bounceRate: parseFloat(row.metricValues[2].value),
          avgSessionDuration: parseFloat(row.metricValues[3].value),
        })
        return acc
      },
      {
        totalSessions: 0,
        totalUsers: 0,
        bounceRates: [],
        sessionDurations: [],
        pages: [],
      }
    )

    return {
      totalSessions: metrics.totalSessions,
      totalUsers: metrics.totalUsers,
      avgBounceRate:
        metrics.bounceRates.reduce((a: number, b: number) => a + b, 0) / metrics.bounceRates.length,
      avgSessionDuration:
        metrics.sessionDurations.reduce((a: number, b: number) => a + b, 0) /
        metrics.sessionDurations.length,
      topPages: metrics.pages.slice(0, 10),
    }
  }

  /**
   * Format search queries response
   */
  private formatSearchQueries(data: any) {
    if (!data.rows || data.rows.length === 0) {
      return []
    }

    return data.rows.map((row: any) => ({
      query: row.dimensionValues[0].value || row.dimensionValues[1].value,
      clicks: parseInt(row.metricValues[0].value),
      impressions: parseInt(row.metricValues[1].value),
      ctr: parseFloat(row.metricValues[2].value),
      position: parseFloat(row.metricValues[3].value),
    }))
  }

  /**
   * Format top pages response
   */
  private formatTopPages(data: any) {
    if (!data.rows || data.rows.length === 0) {
      return []
    }

    return data.rows.map((row: any) => ({
      page: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      bounceRate: parseFloat(row.metricValues[2].value),
      avgSessionDuration: parseFloat(row.metricValues[3].value),
    }))
  }
}

/**
 * Connect a GA4 property to an agency
 */
export async function connectGA4Property(
  agencyId: string,
  propertyId: string,
  propertyName: string,
  refreshToken?: string
) {
  return await prisma.agency.update({
    where: { id: agencyId },
    data: {
      ga4PropertyId: propertyId,
      ga4PropertyName: propertyName,
      ga4RefreshToken: refreshToken,
    },
  })
}

/**
 * Get GA4 property for an agency
 */
export async function getGA4Property(agencyId: string) {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      ga4PropertyId: true,
      ga4PropertyName: true,
      ga4RefreshToken: true,
    },
  })

  return agency
}
