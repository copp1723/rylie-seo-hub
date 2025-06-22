import { google } from 'googleapis'
import { prisma } from './prisma'

const analyticsdata = google.analyticsdata('v1beta')
const analytics = google.analytics('v3')
const analyticsadmin = google.analyticsadmin('v1beta')

export class GA4Service {
  private auth: any

  constructor(accessToken: string) {
    this.auth = new google.auth.OAuth2()
    this.auth.setCredentials({ access_token: accessToken })
  }

  /**
   * List all GA4 properties the user has access to
   */
  async listProperties() {
    try {
      const response = await analyticsadmin.properties.list({
        auth: this.auth,
        filter: 'ancestor:accounts/-', // List all properties
      })

      return response.data.properties || []
    } catch (error) {
      console.error('Error listing GA4 properties:', error)
      throw new Error('Failed to list GA4 properties')
    }
  }

  /**
   * Get SEO-related metrics from GA4
   */
  async getSEOMetrics(propertyId: string, dateRange = 'last30Days') {
    try {
      const response = await analyticsdata.properties.runReport({
        auth: this.auth,
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
          limit: 50,
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
      const response = await analyticsdata.properties.runReport({
        auth: this.auth,
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [this.getDateRange(dateRange)],
          dimensions: [
            { name: 'searchTerm' },
          ],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
          ],
          orderBys: [
            {
              metric: {
                metricName: 'sessions',
              },
              desc: true,
            },
          ],
          limit: 50,
        },
      })

      return this.formatSearchQueries(response.data)
    } catch (error) {
      console.error('Error fetching search queries:', error)
      // Search console integration might not be enabled
      return []
    }
  }

  /**
   * Get top performing pages
   */
  async getTopPages(propertyId: string, dateRange = 'last30Days') {
    try {
      const response = await analyticsdata.properties.runReport({
        auth: this.auth,
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [this.getDateRange(dateRange)],
          dimensions: [
            { name: 'pagePath' },
            { name: 'pageTitle' },
          ],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'totalUsers' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
          ],
          orderBys: [
            {
              metric: {
                metricName: 'screenPageViews',
              },
              desc: true,
            },
          ],
          limit: 20,
        },
      })

      return this.formatTopPages(response.data)
    } catch (error) {
      console.error('Error fetching top pages:', error)
      throw new Error('Failed to fetch top pages')
    }
  }

  /**
   * Helper to get date range
   */
  private getDateRange(range: string) {
    const today = new Date()
    const startDate = new Date()

    switch (range) {
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
    const rows = data.rows || []
    
    return {
      summary: {
        totalOrganicSessions: rows.reduce((sum: number, row: any) => sum + parseInt(row.metricValues[0].value), 0),
        totalOrganicUsers: rows.reduce((sum: number, row: any) => sum + parseInt(row.metricValues[1].value), 0),
        avgBounceRate: rows.length > 0 ? 
          rows.reduce((sum: number, row: any) => sum + parseFloat(row.metricValues[2].value), 0) / rows.length : 0,
        avgSessionDuration: rows.length > 0 ?
          rows.reduce((sum: number, row: any) => sum + parseFloat(row.metricValues[3].value), 0) / rows.length : 0,
      },
      topLandingPages: rows.slice(0, 10).map((row: any) => ({
        page: row.dimensionValues[1].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        bounceRate: parseFloat(row.metricValues[2].value),
        avgDuration: parseFloat(row.metricValues[3].value),
      })),
    }
  }

  /**
   * Format search queries response
   */
  private formatSearchQueries(data: any) {
    const rows = data.rows || []
    
    return rows.map((row: any) => ({
      query: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
    }))
  }

  /**
   * Format top pages response
   */
  private formatTopPages(data: any) {
    const rows = data.rows || []
    
    return rows.map((row: any) => ({
      path: row.dimensionValues[0].value,
      title: row.dimensionValues[1].value,
      pageViews: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      avgDuration: parseFloat(row.metricValues[2].value),
      bounceRate: parseFloat(row.metricValues[3].value),
    }))
  }
}

/**
 * Store GA4 property for an agency
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
 * Get GA4 data for an agency
 */
export async function getAgencyGA4Data(agencyId: string, accessToken: string) {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      ga4PropertyId: true,
      ga4PropertyName: true,
    },
  })

  if (!agency?.ga4PropertyId) {
    throw new Error('No GA4 property connected')
  }

  const ga4 = new GA4Service(accessToken)
  
  const [seoMetrics, topPages] = await Promise.all([
    ga4.getSEOMetrics(agency.ga4PropertyId),
    ga4.getTopPages(agency.ga4PropertyId),
  ])

  return {
    propertyName: agency.ga4PropertyName,
    seoMetrics,
    topPages,
  }
}