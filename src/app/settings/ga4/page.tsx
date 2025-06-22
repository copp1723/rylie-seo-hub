'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

export default function GA4SettingsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [currentConnection, setCurrentConnection] = useState<any>(null)
  const [checkingConnection, setCheckingConnection] = useState(true)
  
  // Check current GA4 connection status
  useEffect(() => {
    checkCurrentConnection()
  }, [])
  
  const checkCurrentConnection = async () => {
    try {
      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.ga4PropertyId) {
          setCurrentConnection({
            propertyId: data.ga4PropertyId,
            propertyName: data.ga4PropertyName || data.ga4PropertyId
          })
        }
      }
    } catch (err) {
      console.error('Failed to check GA4 connection:', err)
    } finally {
      setCheckingConnection(false)
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
      
      setProperties(data.properties)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GA4 properties')
    } finally {
      setLoading(false)
    }
  }
  
  const connectProperty = async () => {
    if (!selectedProperty) return
    
    setLoading(true)
    setError(null)
    
    try {
      const property = properties.find(p => p.id === selectedProperty)
      
      const response = await fetch('/api/ga4/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          propertyName: property.name,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect property')
      }
      
      setSuccess(true)
      setCurrentConnection({
        propertyId: property.id,
        propertyName: property.name
      })
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect GA4 property')
    } finally {
      setLoading(false)
    }
  }
  
  const disconnectProperty = async () => {
    if (!confirm('Are you sure you want to disconnect your GA4 property?')) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ga4/disconnect', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to disconnect property')
      }
      
      setCurrentConnection(null)
      setSelectedProperty(null)
      setProperties([])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect GA4 property')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="settings-page">
      <div className="container max-w-4xl py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">GA4 Integration</h1>
          <p className="text-muted-foreground">Connect your Google Analytics 4 property to enable SEO insights</p>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <p>{error}</p>
          </Alert>
        )}
        
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <p className="text-green-800">
              {currentConnection ? 'GA4 property connected successfully!' : 'GA4 property disconnected successfully!'}
            </p>
          </Alert>
        )}
        
        {/* Current Connection Status */}
        {!checkingConnection && (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Connection Status</h2>
                {currentConnection ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                      <span className="text-sm text-muted-foreground">
                        {currentConnection.propertyName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Property ID: {currentConnection.propertyId}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2">
                    <Badge variant="secondary">Not Connected</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Connect a GA4 property to enable analytics insights
                    </p>
                  </div>
                )}
              </div>
              {currentConnection && (
                <Button 
                  variant="outline" 
                  onClick={disconnectProperty}
                  disabled={loading}
                  className="text-destructive hover:text-destructive"
                >
                  Disconnect
                </Button>
              )}
            </div>
          </Card>
        )}
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {currentConnection ? 'Change GA4 Property' : 'Connect GA4 Property'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <Button onClick={fetchProperties} disabled={loading}>
                {loading ? 'Loading...' : 'Load GA4 Properties'}
              </Button>
            </div>
            
            {properties.length > 0 && (
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">
                    Select a property:
                  </label>
                  <select
                    className="input w-full"
                    value={selectedProperty || ''}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                  >
                    <option value="">Choose a property...</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name} (ID: {property.id})
                      </option>
                    ))}
                  </select>
                </div>
                
                <Button 
                  onClick={connectProperty} 
                  disabled={!selectedProperty || loading}
                  className="w-full"
                >
                  {currentConnection ? 'Update Property Connection' : 'Connect Selected Property'}
                </Button>
              </div>
            )}
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Click "Load GA4 Properties" to see your available properties</li>
            <li>Select the property for your dealership website</li>
            <li>Click "Connect Selected Property" to save the connection</li>
            <li>The AI assistant will now have access to your real GA4 data</li>
            <li>Ask questions about your SEO performance in the chat!</li>
          </ol>
        </Card>
      </div>
    </div>
  )
}