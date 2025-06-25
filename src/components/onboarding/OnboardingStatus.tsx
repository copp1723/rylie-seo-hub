'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface OnboardingRecord {
  id: string
  businessName: string
  package: string
  status: string
  submittedAt: string | null
  createdAt: string
  contactName: string
  email: string
  seoworksResponse: any
}

export default function OnboardingStatus() {
  const [onboardings, setOnboardings] = useState<OnboardingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOnboardings()
  }, [])

  const fetchOnboardings = async () => {
    try {
      const response = await fetch('/api/onboarding')
      if (response.ok) {
        const data = await response.json()
        setOnboardings(data.onboardings)
      } else {
        throw new Error('Failed to fetch onboarding records')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'failed':
        return 'destructive'
      case 'processing':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading onboarding records...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600">
            <p>Error loading onboarding records: {error}</p>
            <Button onClick={fetchOnboardings} variant="outline" size="sm" className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Onboarding Status</h2>
        <Button onClick={fetchOnboardings} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {onboardings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600">No onboarding records found.</p>
            <Button onClick={() => (window.location.href = '/onboarding')} className="mt-4">
              Start Onboarding
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {onboardings.map(onboarding => (
            <Card key={onboarding.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{onboarding.businessName}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {onboarding.contactName} • {onboarding.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{onboarding.package}</Badge>
                    <Badge variant={getStatusBadgeVariant(onboarding.status)}>
                      {onboarding.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(onboarding.createdAt)}
                  </div>
                  {onboarding.submittedAt && (
                    <div>
                      <span className="font-medium">Submitted:</span>{' '}
                      {formatDate(onboarding.submittedAt)}
                    </div>
                  )}
                </div>

                {onboarding.seoworksResponse && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <div className="text-sm">
                      <span className="font-medium">SEOWerks Response:</span>
                      <div className="mt-1">
                        {onboarding.seoworksResponse.success ? (
                          <span className="text-green-600">
                            ✓ {onboarding.seoworksResponse.message}
                          </span>
                        ) : (
                          <span className="text-red-600">
                            ✗ {onboarding.seoworksResponse.error || 'Submission failed'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
