import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'
import prisma from '@/lib/prisma'

interface SearchAnalyticsOptions {
  startDate: string
  endDate: string
  dimensions?: string[]
  searchType?: string
  rowLimit?: number
  filters?: any[]
}

export class SearchConsoleService {
  private searchConsole

  constructor(accessToken: string, refreshToken?: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    this.searchConsole = google.searchconsole({
      version: 'v1',
      auth: oauth2Client,
    })
  }

  async listSites() {
    const response = await this.searchConsole.sites.list()
    return response.data.siteEntry || []
  }

  async getSearchAnalytics(siteUrl: string, options: SearchAnalyticsOptions) {
    const response = await this.searchConsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: options.dimensions || ['query', 'page'],
        searchType: options.searchType || 'web',
        rowLimit: options.rowLimit || 1000,
        dimensionFilterGroups: options.filters,
      },
    })

    return response.data
  }

  async getTopQueries(siteUrl: string, days = 28) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return this.getSearchAnalytics(siteUrl, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['query'],
      rowLimit: 100,
    })
  }

  async getTopPages(siteUrl: string, days = 28) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return this.getSearchAnalytics(siteUrl, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['page'],
      rowLimit: 100,
    })
  }

  async getPerformanceByQuery(siteUrl: string, query: string, days = 28) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return this.getSearchAnalytics(siteUrl, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['date'],
      filters: [{
        filters: [{
          dimension: 'query',
          operator: 'equals',
          expression: query,
        }],
      }],
    })
  }
}

// Helper to get service instance for a user
export async function getSearchConsoleService(userId: string) {
  const token = await prisma.userSearchConsoleToken.findUnique({
    where: { userId },
  })

  if (!token) {
    throw new Error('No Search Console token found for user')
  }

  const accessToken = decrypt(token.encryptedAccessToken)
  const refreshToken = token.encryptedRefreshToken 
    ? decrypt(token.encryptedRefreshToken) 
    : undefined

  return new SearchConsoleService(accessToken, refreshToken)
}