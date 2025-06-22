'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

export default function GA4SettingsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
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
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect GA4 property')
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
          <Alert>
            <p>GA4 property connected successfully!</p>
          </Alert>
        )}
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Connect GA4 Property</h2>
          
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
                  Connect Selected Property
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