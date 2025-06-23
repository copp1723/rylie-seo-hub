'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RequestForm, RequestData } from '@/components/requests/RequestForm'
import { Sidebar } from '@/components/chat/Sidebar'
import { 
  Target,
  TrendingUp,
  FileText,
  Search,
  Calendar,
  ArrowRight,
  Building2,
  Users,
  Globe,
  X,
  CheckCircle2
} from 'lucide-react'

interface DashboardStats {
  totalOrders: number
  completedOrders: number
  activeRequests: number
  monthlyFocus?: RequestData
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    completedOrders: 0,
    activeRequests: 0
  })
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionSuccess, setSubmissionSuccess] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/')
    }
  }, [status])

  useEffect(() => {
    if (session) {
      loadDashboardData()
    }
  }, [session])

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        const orders = data.orders || []
        
        setStats({
          totalOrders: orders.length,
          completedOrders: orders.filter((o: any) => o.status === 'completed').length,
          activeRequests: orders.filter((o: any) => o.status === 'in_progress').length,
          monthlyFocus: orders.find((o: any) => o.taskType === 'seo' && o.metadata)?.metadata
        })
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const handleRequestSubmit = async (data: RequestData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'seo',
          title: 'Monthly SEO Focus Request',
          description: `Target Cities: ${data.targetCities || 'Not specified'}\n` +
                      `Target Models: ${data.targetModels || 'Not specified'}\n` +
                      `Competitor Dealerships: ${data.competitorDealerships || 'Not specified'}\n` +
                      `Market Specifics: ${data.marketSpecifics || 'Not specified'}\n` +
                      `Additional Focus: ${data.additionalFocus || 'Not specified'}`,
          metadata: data
        })
      })

      if (response.ok) {
        setSubmissionSuccess(true)
        setShowRequestModal(false)
        await loadDashboardData()
        
        // Show success message for 5 seconds
        setTimeout(() => {
          setSubmissionSuccess(false)
        }, 5000)
      }
    } catch (error) {
      console.error('Error submitting request:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar user={session.user} />
      
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-card border-b">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {session.user?.name || session.user?.email}</p>
          </div>
        </header>

      {/* Success Banner */}
      {submissionSuccess && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <div className="container mx-auto flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">
              Your monthly SEO focus request has been submitted successfully!
            </p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Total Orders</CardTitle>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalOrders}</p>
              <p className="text-sm text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Completed</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.completedOrders}</p>
              <p className="text-sm text-muted-foreground mt-1">Delivered this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Active</CardTitle>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.activeRequests}</p>
              <p className="text-sm text-muted-foreground mt-1">In progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Focus Request Section */}
        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Monthly SEO Focus
                </CardTitle>
                <CardDescription className="mt-1">
                  Help us align our content strategy with your dealership goals
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                Optional
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {stats.monthlyFocus ? (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  {stats.monthlyFocus.targetCities && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">Target Cities</p>
                        <p className="text-muted-foreground">{stats.monthlyFocus.targetCities}</p>
                      </div>
                    </div>
                  )}
                  {stats.monthlyFocus.targetModels && (
                    <div className="flex items-start gap-3">
                      <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">Target Models</p>
                        <p className="text-muted-foreground">{stats.monthlyFocus.targetModels}</p>
                      </div>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowRequestModal(true)}
                >
                  Update Monthly Focus
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">
                  No monthly focus set yet. Share your priorities to help us create targeted content.
                </p>
                <Button onClick={() => setShowRequestModal(true)}>
                  Submit Monthly Request
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => redirect('/onboarding')}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Dealership Onboarding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete setup with SEOWerks services
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => redirect('/chat')}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Start Chat with Rylie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get instant SEO advice and recommendations
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => redirect('/orders')}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                View Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track your SEO content and deliverables
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => redirect('/settings/ga4')}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Analytics Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Connect Google Analytics for insights
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-background rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 z-10"
              onClick={() => setShowRequestModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="p-6">
              <RequestForm 
                onSubmit={handleRequestSubmit}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
