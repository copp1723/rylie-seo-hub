import { google, analyticsadmin_v1alpha } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { getAuthenticatedGA4Client } from './tokens'

export interface GA4Property {
  name: string
  displayName: string
  parent: string
  createTime?: string
  updateTime?: string
  industryCategory?: string
  timeZone?: string
  currencyCode?: string
  measurementId?: string
}

export interface GA4Account {
  name: string
  displayName: string
  createTime?: string
  updateTime?: string
}

export interface FormattedProperty {
  accountName: string
  accountId: string
  propertyName: string
  propertyId: string
  measurementId?: string
}

export class GA4Service {
  private analyticsAdmin: analyticsadmin_v1alpha.Analyticsadmin
  
  constructor(private oauth2Client: OAuth2Client) {
    this.analyticsAdmin = google.analyticsadmin({
      version: 'v1alpha',
      auth: this.oauth2Client
    })
  }

  /**
   * Create GA4Service instance with user's authenticated OAuth client
   */
  static async createForUser(userId: string): Promise<GA4Service> {
    const oauth2Client = await getAuthenticatedGA4Client(userId)
    return new GA4Service(oauth2Client)
  }

  /**
   * List all accessible GA4 accounts
   */
  async listAccounts(): Promise<GA4Account[]> {
    try {
      const response = await this.analyticsAdmin.accounts.list({
        pageSize: 200
      })
      
      return response.data.accounts || []
    } catch (error) {
      console.error('Error listing GA4 accounts:', error)
      throw new Error('Failed to list GA4 accounts')
    }
  }

  /**
   * List all accessible GA4 properties with their account information
   */
  async listProperties(): Promise<FormattedProperty[]> {
    try {
      // First, get all accounts
      const accountsResponse = await this.analyticsAdmin.accounts.list({
        pageSize: 200
      })
      
      const accounts = accountsResponse.data.accounts || []
      const allProperties: FormattedProperty[] = []
      
      // For each account, get its properties
      for (const account of accounts) {
        try {
          const propertiesResponse = await this.analyticsAdmin.properties.list({
            filter: `parent:${account.name}`,
            pageSize: 200
          })
          
          const properties = propertiesResponse.data.properties || []
          
          // Get data streams for each property to find measurement IDs
          for (const property of properties) {
            let measurementId: string | undefined
            
            try {
              // List web data streams to get measurement ID
              const dataStreamsResponse = await this.analyticsAdmin.properties.webDataStreams.list({
                parent: property.name,
                pageSize: 10
              })
              
              const webStream = dataStreamsResponse.data.webDataStreams?.[0]
              measurementId = webStream?.measurementId
            } catch (streamError) {
              console.warn(`Failed to get data streams for property ${property.name}:`, streamError)
            }
            
            allProperties.push({
              accountName: account.displayName || 'Unknown Account',
              accountId: account.name?.replace('accounts/', '') || '',
              propertyName: property.displayName || 'Unknown Property',
              propertyId: property.name?.replace('properties/', '') || '',
              measurementId
            })
          }
        } catch (propertyError) {
          console.warn(`Failed to list properties for account ${account.name}:`, propertyError)
        }
      }
      
      return allProperties
    } catch (error) {
      console.error('Error listing GA4 properties:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('Request had insufficient authentication scopes')) {
          throw new Error('Insufficient permissions. Please reconnect with analytics.readonly scope.')
        }
        throw error
      }
      
      throw new Error('Failed to list GA4 properties')
    }
  }

  /**
   * Get a specific property by ID
   */
  async getProperty(propertyId: string): Promise<GA4Property | null> {
    try {
      const response = await this.analyticsAdmin.properties.get({
        name: `properties/${propertyId}`
      })
      
      return response.data as GA4Property
    } catch (error) {
      console.error(`Error getting property ${propertyId}:`, error)
      return null
    }
  }

  /**
   * Verify if the user has access to a specific property
   */
  async verifyPropertyAccess(propertyId: string): Promise<boolean> {
    try {
      await this.analyticsAdmin.properties.get({
        name: `properties/${propertyId}`
      })
      return true
    } catch (error) {
      return false
    }
  }
}