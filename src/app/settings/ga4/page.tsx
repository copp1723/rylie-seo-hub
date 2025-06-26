'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Toast } from '@/components/ui/toast'
import { CheckCircle, AlertCircle, BarChart, ExternalLink, RefreshCw, Unlink, Settings } from 'lucide-react'

interface GA4Property {
  accountName: string
  accountId: string
  propertyName: string
  propertyId: string
  measurementId?: string
}

interface ConnectionStatus {
  isConnected: boolean
  propertyId?: string
  propertyName?: string
  lastSynced?: string
}

export default function GA4SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<GA4Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>('')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ isConnected: false })
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ show: boolean; variant: 'success' | 'error'; message: string }>({
    show: false,
    variant: 'success',
    message: ''
  })
  
  console.log('GA4SettingsPage rendering, session:', session)

  // Check for OAuth callback status
  useEffect(() => {
    const status = searchParams.get('status')
    if (status === 'success') {
      setToast({ show: true, variant: 'success', message: 'GA4 account connected successfully!' })
      // Clear URL parameters
      router.replace('/settings/ga4', { scroll: false })
      // Refresh connection status
      checkConnectionStatus()
    } else if (status === 'error') {
      const errorMsg = searchParams.get('error') || 'Failed to connect GA4 account'
      setToast({ show: true, variant: 'error', message: errorMsg })
      router.replace('/settings/ga4', { scroll: false })
    }
  }, [searchParams, router])

  // Load connection status on mount
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      console.log('Checking GA4 connection status...')
      const response = await fetch('/api/agencies/current')
      console.log('Agency API response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Agency API error:', errorData)
        return
      }
      
      const agency = await response.json()
      console.log('Agency data:', agency)
      
      setConnectionStatus({
        isConnected: !!agency.ga4PropertyId,
        propertyId: agency.ga4PropertyId,
        propertyName: agency.ga4PropertyName,
        lastSynced: agency.updatedAt
      })
      
      // If connected, load properties to populate selector
      if (agency.ga4PropertyId) {
        await fetchProperties()
        setSelectedProperty(agency.ga4PropertyId)
      }
    } catch (err) {
      console.error('Error checking connection status:', err)
    }
  }

  const connectGA4 = async () => {
    if (!session?.user?.id) return
    
    setLoading(true)
    try {
      // Redirect to OAuth flow
      window.location.href = `/api/ga4/auth?action=authorize&userId=${session.user.id}`
    } catch (err) {
      setError('Failed to initiate GA4 connection')
      setLoading(false)
    }
  }

  const fetchProperties = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ga4/properties')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch properties')
      }

      setProperties(data.properties || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GA4 properties')
    } finally {
      setLoading(false)
    }
  }

  const savePropertySelection = async () => {
    if (!selectedProperty) return

    setLoading(true)
    setError(null)

    try {
      const property = properties.find(p => p.propertyId === selectedProperty)
      
      const response = await fetch('/api/ga4/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property?.propertyId,
          propertyName: property?.propertyName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect property')
      }

      setToast({ show: true, variant: 'success', message: 'GA4 property connected successfully!' })
      await checkConnectionStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect GA4 property')
    } finally {
      setLoading(false)
    }
  }

  const disconnectGA4 = async () => {
    if (!confirm('Are you sure you want to disconnect your GA4 account? This will stop all automated reports.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/ga4/disconnect', {
        method: 'POST',
      })

      if (response.ok) {
        setConnectionStatus({ isConnected: false })
        setProperties([])
        setSelectedProperty('')
        setToast({ show: true, variant: 'success', message: 'GA4 account disconnected successfully.' })
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (err) {
      setError('Failed to disconnect GA4 account')
    } finally {
      setLoading(false)
    }
  }

  const dismissToast = () => {
    setToast({ ...toast, show: false })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">GA4 Integration</h1>
        <p className="text-muted-foreground mt-2">
          Connect your Google Analytics 4 property to enable SEO insights and automated reporting
        </p>
      </div>

      {/* Toast Notifications */}
      {toast.show && (
        <Toast
          variant={toast.variant}
          description={toast.message}
          onClose={dismissToast}
        />
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </Alert>
      )}

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Connection Status
          </CardTitle>
          <CardDescription>
            Your current GA4 integration status and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connectionStatus.isConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Connected</p>
                    <p className="text-sm text-muted-foreground">
                      {connectionStatus.propertyName}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium">Not Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your GA4 account to enable features
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {connectionStatus.isConnected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchProperties}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectGA4}
                    disabled={loading}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={connectGA4} disabled={loading}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {loading ? 'Connecting...' : 'Connect GA4 Account'}
                </Button>
              )}
            </div>
          </div>

          {connectionStatus.isConnected && connectionStatus.lastSynced && (
            <div className="text-sm text-muted-foreground pt-2 border-t">
              Last synced: {new Date(connectionStatus.lastSynced).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Selection Card */}
      {connectionStatus.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Property Selection</CardTitle>
            <CardDescription>
              Choose which GA4 property to use for reporting and analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Property</label>
              <Select 
                value={selectedProperty} 
                onValueChange={setSelectedProperty}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a GA4 property..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem 
                      key={property.propertyId} 
                      value={property.propertyId}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{property.propertyName}</span>
                        <span className="text-xs text-muted-foreground">
                          Account: {property.accountName} • ID: {property.propertyId}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProperty && selectedProperty !== connectionStatus.propertyId && (
              <Button 
                onClick={savePropertySelection} 
                disabled={loading}
                className="w-full"
              >
                Save Property Selection
              </Button>
            )}

            {!properties.length && (
              <div className="text-center py-4">
                <Button variant="outline" onClick={fetchProperties} disabled={loading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Properties
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Scheduling Card */}
      {connectionStatus.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Automated Reports
            </CardTitle>
            <CardDescription>
              Schedule automated SEO reports to be sent to your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Report Scheduling</p>
                <p className="text-sm text-muted-foreground">
                  Set up weekly, monthly, or quarterly reports
                </p>
              </div>
              <Button 
                onClick={() => router.push('/settings/ga4/schedules')}
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Schedules
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Getting Started Guide */}
      {!connectionStatus.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Follow these steps to connect your GA4 account</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>Click "Connect GA4 Account" to start the authorization process</li>
              <li>Sign in with your Google account that has access to GA4</li>
              <li>Grant permissions for analytics data access</li>
              <li>Select the GA4 property for your website</li>
              <li>Set up automated report schedules (optional)</li>
            </ol>
            
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Required Permissions
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• View Google Analytics data</li>
                <li>• Access to Google Analytics Management API</li>
                <li>• Read access to your GA4 properties</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}