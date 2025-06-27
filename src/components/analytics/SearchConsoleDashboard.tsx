'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSearchConsole } from '@/hooks/useSearchConsole'
import { Search, TrendingUp, FileText } from 'lucide-react'

export function SearchConsoleDashboard() {
  const [primarySite, setPrimarySite] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Fetch primary site
    fetchPrimarySite()
  }, [])

  const fetchPrimarySite = async () => {
    try {
      const response = await fetch('/api/search-console/sites')
      if (response.ok) {
        const data = await response.json()
        // Get primary site from token or first site
        if (data.sites && data.sites.length > 0) {
          setPrimarySite(data.sites[0].siteUrl)
        }
      }
    } catch (error) {
      console.error('Failed to fetch primary site:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const { data, loading, error } = useSearchConsole(primarySite || '', 28)

  if (isLoading || !primarySite) {
    return null
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Failed to load Search Console data: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Performance</CardTitle>
        <CardDescription>
          Analyze your search performance over the last 28 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="queries" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="queries">Top Queries</TabsTrigger>
            <TabsTrigger value="pages">Top Pages</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="queries" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Top Search Queries
              </h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-2">
                  {data?.queries.slice(0, 10).map((query, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{query.keys[0]}</span>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{query.clicks} clicks</span>
                        <span>{(query.ctr * 100).toFixed(1)}% CTR</span>
                        <span>#{query.position.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="pages" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Top Performing Pages
              </h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-2">
                  {data?.pages.slice(0, 10).map((page, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm truncate flex-1">{page.keys[0]}</span>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{page.clicks} clicks</span>
                        <span>{page.impressions} impressions</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Overall Performance
              </h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-normal">Total Clicks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {data?.performance.reduce((sum, day) => sum + day.clicks, 0) || 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-normal">Total Impressions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {data?.performance.reduce((sum, day) => sum + day.impressions, 0) || 0}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}