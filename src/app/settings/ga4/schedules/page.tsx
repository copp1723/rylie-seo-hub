'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Toast } from '@/components/ui/toast'
import { 
  ArrowLeft, 
  Plus, 
  Settings, 
  Play, 
  Pause, 
  Trash2, 
  Mail, 
  Calendar, 
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { ScheduleForm } from './schedule-form'

interface ReportSchedule {
  id: string
  reportType: string
  cronPattern: string
  emailRecipients: string[]
  isActive: boolean
  lastRun?: string
  nextRun?: string
  createdAt: string
}

export default function GA4SchedulesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null)
  const [toast, setToast] = useState<{ show: boolean; variant: 'success' | 'error'; message: string }>({ 
    show: false, 
    variant: 'success', 
    message: '' 
  })

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/reports/schedules')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch schedules')
      }
      
      setSchedules(data.schedules || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  const toggleScheduleStatus = async (scheduleId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/reports/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update schedule')
      }
      
      await fetchSchedules()
      setToast({ 
        show: true, 
        variant: 'success', 
        message: `Schedule ${!currentStatus ? 'activated' : 'paused'} successfully` 
      })
    } catch (err) {
      setToast({ 
        show: true, 
        variant: 'error', 
        message: 'Failed to update schedule status' 
      })
    }
  }

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/reports/schedules/${scheduleId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete schedule')
      }
      
      await fetchSchedules()
      setToast({ 
        show: true, 
        variant: 'success', 
        message: 'Schedule deleted successfully' 
      })
    } catch (err) {
      setToast({ 
        show: true, 
        variant: 'error', 
        message: 'Failed to delete schedule' 
      })
    }
  }

  const testReport = async (schedule: ReportSchedule) => {
    try {
      const response = await fetch('/api/reports/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: schedule.reportType,
          emailRecipients: schedule.emailRecipients,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate test report')
      }
      
      setToast({ 
        show: true, 
        variant: 'success', 
        message: 'Test report generated and sent successfully!' 
      })
    } catch (err) {
      setToast({ 
        show: true, 
        variant: 'error', 
        message: 'Failed to generate test report' 
      })
    }
  }

  const formatCronPattern = (pattern: string): string => {
    // Convert cron pattern to human-readable format
    const parts = pattern.split(' ')
    if (parts.length < 5) return pattern
    
    const minute = parts[0]
    const hour = parts[1]
    const dayOfMonth = parts[2]
    const month = parts[3]
    const dayOfWeek = parts[4]
    
    if (dayOfWeek !== '*' && dayOfMonth === '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return `Weekly on ${days[parseInt(dayOfWeek)]} at ${hour}:${minute.padStart(2, '0')}`
    }
    
    if (dayOfMonth !== '*' && dayOfWeek === '*') {
      return `Monthly on day ${dayOfMonth} at ${hour}:${minute.padStart(2, '0')}`
    }
    
    return pattern
  }

  const formatReportType = (type: string): string => {
    switch (type) {
      case 'WeeklySummary': return 'Weekly Summary'
      case 'MonthlyReport': return 'Monthly Report'
      case 'QuarterlyBusinessReview': return 'Quarterly Business Review'
      default: return type
    }
  }

  const dismissToast = () => {
    setToast({ ...toast, show: false })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading schedules...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings/ga4">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Report Schedules</h1>
            <p className="text-muted-foreground mt-2">
              Manage your automated GA4 SEO reports
            </p>
          </div>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Report Schedule</DialogTitle>
              <DialogDescription>
                Set up a new automated report schedule
              </DialogDescription>
            </DialogHeader>
            <ScheduleForm
              onSuccess={() => {
                setShowCreateDialog(false)
                fetchSchedules()
                setToast({ 
                  show: true, 
                  variant: 'success', 
                  message: 'Schedule created successfully!' 
                })
              }}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
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

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-medium">No schedules configured</h3>
                <p className="text-muted-foreground">
                  Create your first automated report schedule to get started
                </p>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {formatReportType(schedule.reportType)}
                      {schedule.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Paused</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatCronPattern(schedule.cronPattern)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {schedule.emailRecipients.length} recipient{schedule.emailRecipients.length !== 1 ? 's' : ''}
                      </span>
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testReport(schedule)}
                    >
                      Test Report
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleScheduleStatus(schedule.id, schedule.isActive)}
                    >
                      {schedule.isActive ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSchedule(schedule)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteSchedule(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email Recipients</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {schedule.emailRecipients.map((email, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {email}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-muted-foreground">Created</label>
                      <p>{new Date(schedule.createdAt).toLocaleDateString()}</p>
                    </div>
                    
                    {schedule.lastRun && (
                      <div>
                        <label className="font-medium text-muted-foreground">Last Run</label>
                        <p className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {new Date(schedule.lastRun).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    
                    {schedule.nextRun && schedule.isActive && (
                      <div>
                        <label className="font-medium text-muted-foreground">Next Run</label>
                        <p>{new Date(schedule.nextRun).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Schedule Dialog */}
      {editingSchedule && (
        <Dialog open={!!editingSchedule} onOpenChange={() => setEditingSchedule(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Report Schedule</DialogTitle>
              <DialogDescription>
                Update your automated report schedule
              </DialogDescription>
            </DialogHeader>
            <ScheduleForm
              initialData={editingSchedule}
              onSuccess={() => {
                setEditingSchedule(null)
                fetchSchedules()
                setToast({ 
                  show: true, 
                  variant: 'success', 
                  message: 'Schedule updated successfully!' 
                })
              }}
              onCancel={() => setEditingSchedule(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}