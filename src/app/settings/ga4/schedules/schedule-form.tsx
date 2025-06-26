'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { X, Plus } from 'lucide-react'

interface ReportSchedule {
  id?: string
  reportType: string
  cronPattern: string
  emailRecipients: string[]
  isActive: boolean
  brandingOptionsJson?: string
}

interface ScheduleFormProps {
  initialData?: ReportSchedule
  onSuccess: () => void
  onCancel: () => void
}

interface FrequencyOption {
  value: string
  label: string
  cronPattern: string
}

const reportTypes = [
  { value: 'WeeklySummary', label: 'Weekly Summary' },
  { value: 'MonthlyReport', label: 'Monthly Report' },
  { value: 'QuarterlyBusinessReview', label: 'Quarterly Business Review' },
]

const frequencyOptions: FrequencyOption[] = [
  { value: 'weekly-monday', label: 'Weekly - Monday 9 AM', cronPattern: '0 9 * * 1' },
  { value: 'weekly-friday', label: 'Weekly - Friday 5 PM', cronPattern: '0 17 * * 5' },
  { value: 'monthly-1st', label: 'Monthly - 1st at 9 AM', cronPattern: '0 9 1 * *' },
  { value: 'monthly-15th', label: 'Monthly - 15th at 9 AM', cronPattern: '0 9 15 * *' },
  { value: 'quarterly', label: 'Quarterly - 1st of quarter at 9 AM', cronPattern: '0 9 1 1,4,7,10 *' },
]

export function ScheduleForm({ initialData, onSuccess, onCancel }: ScheduleFormProps) {
  const [formData, setFormData] = useState<ReportSchedule>({
    reportType: initialData?.reportType || '',
    cronPattern: initialData?.cronPattern || '',
    emailRecipients: initialData?.emailRecipients || [],
    isActive: initialData?.isActive ?? true,
    brandingOptionsJson: initialData?.brandingOptionsJson || '',
  })
  
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFrequency, setSelectedFrequency] = useState('')
  const [includeBranding, setIncludeBranding] = useState(false)

  // Set initial frequency based on cron pattern
  useEffect(() => {
    if (initialData?.cronPattern) {
      const matchingOption = frequencyOptions.find(opt => opt.cronPattern === initialData.cronPattern)
      if (matchingOption) {
        setSelectedFrequency(matchingOption.value)
      }
    }
    
    if (initialData?.brandingOptionsJson) {
      setIncludeBranding(true)
    }
  }, [initialData])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const addEmail = () => {
    setEmailError('')
    
    if (!newEmail.trim()) {
      setEmailError('Email is required')
      return
    }
    
    if (!validateEmail(newEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }
    
    if (formData.emailRecipients.includes(newEmail)) {
      setEmailError('Email already added')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      emailRecipients: [...prev.emailRecipients, newEmail]
    }))
    setNewEmail('')
  }

  const removeEmail = (email: string) => {
    setFormData(prev => ({
      ...prev,
      emailRecipients: prev.emailRecipients.filter(e => e !== email)
    }))
  }

  const handleFrequencyChange = (value: string) => {
    setSelectedFrequency(value)
    const option = frequencyOptions.find(opt => opt.value === value)
    if (option) {
      setFormData(prev => ({
        ...prev,
        cronPattern: option.cronPattern
      }))
    }
  }

  const handleBrandingToggle = (checked: boolean) => {
    setIncludeBranding(checked)
    setFormData(prev => ({
      ...prev,
      brandingOptionsJson: checked ? JSON.stringify({ includeLogo: true, includeColors: true }) : ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!formData.reportType) {
      setError('Please select a report type')
      setLoading(false)
      return
    }

    if (!formData.cronPattern) {
      setError('Please select a frequency')
      setLoading(false)
      return
    }

    if (formData.emailRecipients.length === 0) {
      setError('Please add at least one email recipient')
      setLoading(false)
      return
    }

    try {
      const url = initialData ? `/api/reports/schedules/${initialData.id}` : '/api/reports/schedules'
      const method = initialData ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save schedule')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Report Type */}
      <div className="space-y-2">
        <Label htmlFor="reportType">Report Type</Label>
        <Select 
          value={formData.reportType} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, reportType: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            {reportTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label htmlFor="frequency">Frequency</Label>
        <Select value={selectedFrequency} onValueChange={handleFrequencyChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            {frequencyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Email Recipients */}
      <div className="space-y-2">
        <Label>Email Recipients</Label>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
              className={emailError ? 'border-red-500' : ''}
            />
            <Button type="button" onClick={addEmail} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {emailError && (
            <p className="text-sm text-red-600">{emailError}</p>
          )}
          
          {formData.emailRecipients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.emailRecipients.map((email, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Branding Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Include Agency Branding</Label>
            <p className="text-sm text-muted-foreground">
              Add your agency logo and colors to the reports
            </p>
          </div>
          <Switch
            checked={includeBranding}
            onCheckedChange={handleBrandingToggle}
          />
        </div>
      </div>

      {/* Schedule Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Schedule Status</Label>
            <p className="text-sm text-muted-foreground">
              Schedule will be {formData.isActive ? 'active' : 'paused'} after saving
            </p>
          </div>
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
          />
        </div>
      </div>

      {/* Form Actions */}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (initialData ? 'Update Schedule' : 'Create Schedule')}
        </Button>
      </DialogFooter>
    </form>
  )
}