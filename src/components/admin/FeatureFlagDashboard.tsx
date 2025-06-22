'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FeatureFlag } from '@/lib/feature-flags'
import { useFeatureFlags } from '@/components/FeatureFlagProvider'
import { observability } from '@/lib/observability'

interface FeatureFlagDashboardProps {
  className?: string
}

export function FeatureFlagDashboard({ className }: FeatureFlagDashboardProps) {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const { getEnabledFlags } = useFeatureFlags()

  useEffect(() => {
    fetchFlags()
  }, [])

  const fetchFlags = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/feature-flags')

      if (!response.ok) {
        throw new Error('Failed to fetch feature flags')
      }

      const data = await response.json()
      setFlags(data.flags)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      observability.logger.error('feature_flags_fetch_error', err)
    } finally {
      setLoading(false)
    }
  }

  const updateFlag = async (flagKey: string, updates: Partial<FeatureFlag>) => {
    try {
      setSaving(flagKey)

      const response = await fetch('/api/admin/feature-flags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flagKey,
          ...updates,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update feature flag')
      }

      const data = await response.json()

      // Update local state
      setFlags(prev => prev.map(flag => (flag.key === flagKey ? data.flag : flag)))

      observability.trackEvent('feature_flag_updated_ui', {
        flagKey,
        updates,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flag')
      observability.logger.error('feature_flags_update_ui_error', err, { flagKey })
    } finally {
      setSaving(null)
    }
  }

  const getStatusColor = (flag: FeatureFlag) => {
    if (!flag.enabled) return 'bg-gray-500'
    if (flag.rolloutPercentage === 100) return 'bg-green-500'
    if (flag.rolloutPercentage > 50) return 'bg-yellow-500'
    return 'bg-orange-500'
  }

  const getStatusText = (flag: FeatureFlag) => {
    if (!flag.enabled) return 'Disabled'
    if (flag.rolloutPercentage === 100) return 'Fully Enabled'
    return `${flag.rolloutPercentage}% Rollout`
  }

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <Alert variant="destructive">
          <AlertDescription>
            Error loading feature flags: {error}
            <Button variant="outline" size="sm" onClick={fetchFlags} className="ml-2">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const enabledFlags = getEnabledFlags()

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      <div>
        <h1 className="text-3xl font-bold">Feature Flag Management</h1>
        <p className="text-gray-600 mt-2">Manage feature rollouts and progressive deployments</p>
      </div>

      <Tabs defaultValue="flags" className="w-full">
        <TabsList>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{flags.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Enabled Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {flags.filter(f => f.enabled).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Your Active Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{enabledFlags.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Active Features</CardTitle>
              <CardDescription>Features currently enabled for your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {enabledFlags.map(flagKey => (
                  <Badge key={flagKey} variant="secondary">
                    {flagKey}
                  </Badge>
                ))}
                {enabledFlags.length === 0 && (
                  <p className="text-gray-500">No features currently enabled</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags" className="space-y-4">
          {flags.map(flag => (
            <Card key={flag.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {flag.name}
                      <Badge className={`${getStatusColor(flag)} text-white`} variant="secondary">
                        {getStatusText(flag)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{flag.description}</CardDescription>
                  </div>
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={enabled => updateFlag(flag.key, { enabled })}
                    disabled={saving === flag.key}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Rollout Percentage: {flag.rolloutPercentage}%
                  </label>
                  <Slider
                    value={[flag.rolloutPercentage]}
                    onValueChange={([value]) => updateFlag(flag.key, { rolloutPercentage: value })}
                    max={100}
                    step={5}
                    className="w-full"
                    disabled={!flag.enabled || saving === flag.key}
                  />
                </div>

                {flag.userSegments && flag.userSegments.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">User Segments</label>
                    <div className="flex flex-wrap gap-1">
                      {flag.userSegments.map(segment => (
                        <Badge key={segment} variant="outline">
                          {segment}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {flag.dependencies && flag.dependencies.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Dependencies</label>
                    <div className="flex flex-wrap gap-1">
                      {flag.dependencies.map(dep => (
                        <Badge key={dep} variant="outline">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Last updated: {new Date(flag.updatedAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
