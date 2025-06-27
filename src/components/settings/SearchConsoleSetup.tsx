'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, CheckCircle, AlertCircle } from 'lucide-react'

export function SearchConsoleSetup() {
  const [isConnected, setIsConnected] = useState(false)
  const [sites, setSites] = useState<any[]>([])
  const [selectedSite, setSelectedSite] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/search-console/sites')
      if (response.ok) {
        const data = await response.json()
        setSites(data.sites || [])
        setIsConnected(true)
        if (data.sites.length > 0 && !selectedSite) {
          setSelectedSite(data.sites[0].siteUrl)
        }
      }
    } catch (error) {
      console.error('Failed to check Search Console connection:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = () => {
    // Trigger OAuth flow
    window.location.href = '/api/search-console/connect'
  }

  const handleSiteChange = async (siteUrl: string) => {
    setSelectedSite(siteUrl)
    // Save selected site
    await fetch('/api/search-console/primary-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteUrl }),
    })
  }

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/search-console/disconnect', {
        method: 'POST',
      })
      
      if (response.ok) {
        setIsConnected(false)
        setSites([])
        setSelectedSite('')
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Google Search Console
        </CardTitle>
        <CardDescription>
          Connect Search Console to track search performance and keywords
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connect your Google Search Console to unlock:
                <ul className="mt-2 ml-4 list-disc text-sm">
                  <li>Search query tracking</li>
                  <li>Click-through rates</li>
                  <li>Position tracking</li>
                  <li>Page-level performance</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <Button onClick={handleConnect} className="w-full">
              Connect Google Search Console
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Connected</span>
            </div>

            {sites.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Select Primary Site
                </label>
                <Select value={selectedSite} onValueChange={handleSiteChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.siteUrl} value={site.siteUrl}>
                        {site.siteUrl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button variant="outline" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}