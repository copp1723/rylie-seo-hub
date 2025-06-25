'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface OnboardingFormData {
  // Business Information
  businessName: string
  package: 'SILVER' | 'GOLD' | 'PLATINUM'
  mainBrand: string
  otherBrand?: string

  // Location Information
  address: string
  city: string
  state: string
  zipCode: string

  // Contact Information
  contactName: string
  contactTitle: string
  email: string
  phone: string
  websiteUrl: string
  billingEmail: string

  // Site Access
  siteAccessNotes: string

  // Target Arrays (minimum 3 each)
  targetVehicleModels: string[]
  targetCities: string[]
  targetDealers: string[]
}

export default function DealershipOnboardingForm() {
  const [formData, setFormData] = useState<OnboardingFormData>({
    businessName: '',
    package: 'SILVER',
    mainBrand: '',
    otherBrand: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    contactName: '',
    contactTitle: '',
    email: '',
    phone: '',
    websiteUrl: '',
    billingEmail: '',
    siteAccessNotes: '',
    targetVehicleModels: ['', '', ''], // Start with 3 empty fields
    targetCities: ['', '', ''],
    targetDealers: ['', '', ''],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const updateField = (field: keyof OnboardingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateArrayField = (
    field: 'targetVehicleModels' | 'targetCities' | 'targetDealers',
    index: number,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }))
  }

  const addArrayItem = (field: 'targetVehicleModels' | 'targetCities' | 'targetDealers') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ''],
    }))
  }

  const removeArrayItem = (
    field: 'targetVehicleModels' | 'targetCities' | 'targetDealers',
    index: number
  ) => {
    if (formData[field].length > 3) {
      // Don't allow removing below minimum
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index),
      }))
    }
  }

  const validateForm = () => {
    const requiredFields: (keyof OnboardingFormData)[] = [
      'businessName',
      'package',
      'mainBrand',
      'address',
      'city',
      'state',
      'zipCode',
      'contactName',
      'contactTitle',
      'email',
      'phone',
      'websiteUrl',
      'billingEmail',
    ]

    const missingFields = requiredFields.filter(field => {
      const value = formData[field]
      return !value || (typeof value === 'string' && !value.trim())
    })

    // Validate arrays have at least 3 non-empty items
    const arrays = ['targetVehicleModels', 'targetCities', 'targetDealers'] as const
    arrays.forEach(arrayField => {
      const validItems = formData[arrayField].filter(item => item.trim().length > 0)
      if (validItems.length < 3) {
        missingFields.push(arrayField)
      }
    })

    return { isValid: missingFields.length === 0, missingFields }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validateForm()
    if (!validation.isValid) {
      setSubmitStatus({
        type: 'error',
        message: `Please fill in all required fields: ${validation.missingFields.join(', ')}`,
      })
      return
    }

    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'Onboarding submitted successfully! Your information has been sent to SEOWerks.',
        })
        // Reset form after successful submission
        setFormData({
          businessName: '',
          package: 'SILVER',
          mainBrand: '',
          otherBrand: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          contactName: '',
          contactTitle: '',
          email: '',
          phone: '',
          websiteUrl: '',
          billingEmail: '',
          siteAccessNotes: '',
          targetVehicleModels: ['', '', ''],
          targetCities: ['', '', ''],
          targetDealers: ['', '', ''],
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Submission failed')
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Dealership Onboarding</h1>
        <p className="text-lg text-gray-600 mt-2">
          Complete this form to get started with SEOWerks services
        </p>
      </div>

      {submitStatus.type && (
        <Alert
          className={
            submitStatus.type === 'error'
              ? 'border-red-500 bg-red-50'
              : 'border-green-500 bg-green-50'
          }
        >
          <AlertDescription
            className={submitStatus.type === 'error' ? 'text-red-700' : 'text-green-700'}
          >
            {submitStatus.message}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={e => updateField('businessName', e.target.value)}
                  placeholder="Enter business name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="package">Package *</Label>
                <select
                  id="package"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.package}
                  onChange={e =>
                    updateField('package', e.target.value as 'SILVER' | 'GOLD' | 'PLATINUM')
                  }
                  required
                >
                  <option value="SILVER">Silver</option>
                  <option value="GOLD">Gold</option>
                  <option value="PLATINUM">Platinum</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mainBrand">Main Brand *</Label>
                <Input
                  id="mainBrand"
                  value={formData.mainBrand}
                  onChange={e => updateField('mainBrand', e.target.value)}
                  placeholder="e.g., Toyota, Ford, BMW"
                  required
                />
              </div>
              <div>
                <Label htmlFor="otherBrand">Other Brand</Label>
                <Input
                  id="otherBrand"
                  value={formData.otherBrand || ''}
                  onChange={e => updateField('otherBrand', e.target.value)}
                  placeholder="Additional brand (optional)"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle>Location Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={e => updateField('address', e.target.value)}
                placeholder="Street address"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={e => updateField('city', e.target.value)}
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={e => updateField('state', e.target.value)}
                  placeholder="State"
                  required
                />
              </div>
              <div>
                <Label htmlFor="zipCode">Zip Code *</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={e => updateField('zipCode', e.target.value)}
                  placeholder="Zip Code"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={e => updateField('contactName', e.target.value)}
                  placeholder="Primary contact name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactTitle">Contact Title *</Label>
                <Input
                  id="contactTitle"
                  value={formData.contactTitle}
                  onChange={e => updateField('contactTitle', e.target.value)}
                  placeholder="Job title"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="contact@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="websiteUrl">Website URL *</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={e => updateField('websiteUrl', e.target.value)}
                  placeholder="https://example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="billingEmail">Billing Email *</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  value={formData.billingEmail}
                  onChange={e => updateField('billingEmail', e.target.value)}
                  placeholder="billing@example.com"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Site Access Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Site Access Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="siteAccessNotes">Site Access Notes</Label>
              <Textarea
                id="siteAccessNotes"
                value={formData.siteAccessNotes}
                onChange={e => updateField('siteAccessNotes', e.target.value)}
                placeholder="Provide any special instructions for accessing your website (admin credentials, special requirements, etc.)"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Target Arrays */}
        <Card>
          <CardHeader>
            <CardTitle>Target Information</CardTitle>
            <p className="text-sm text-gray-600">
              Please provide at least 3 items for each category below.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Target Vehicle Models */}
            <div>
              <Label>Target Vehicle Models * (minimum 3)</Label>
              <div className="space-y-2 mt-2">
                {formData.targetVehicleModels.map((model, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={model}
                      onChange={e => updateArrayField('targetVehicleModels', index, e.target.value)}
                      placeholder={`Vehicle model ${index + 1}`}
                      className="flex-1"
                    />
                    {formData.targetVehicleModels.length > 3 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('targetVehicleModels', index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('targetVehicleModels')}
                >
                  Add Vehicle Model
                </Button>
              </div>
            </div>

            {/* Target Cities */}
            <div>
              <Label>Target Cities * (minimum 3)</Label>
              <div className="space-y-2 mt-2">
                {formData.targetCities.map((city, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={city}
                      onChange={e => updateArrayField('targetCities', index, e.target.value)}
                      placeholder={`Target city ${index + 1}`}
                      className="flex-1"
                    />
                    {formData.targetCities.length > 3 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('targetCities', index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('targetCities')}
                >
                  Add Target City
                </Button>
              </div>
            </div>

            {/* Target Dealers */}
            <div>
              <Label>Target Dealers * (minimum 3)</Label>
              <div className="space-y-2 mt-2">
                {formData.targetDealers.map((dealer, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={dealer}
                      onChange={e => updateArrayField('targetDealers', index, e.target.value)}
                      placeholder={`Target dealer ${index + 1}`}
                      className="flex-1"
                    />
                    {formData.targetDealers.length > 3 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('targetDealers', index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('targetDealers')}
                >
                  Add Target Dealer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto px-8">
            {isSubmitting ? 'Submitting...' : 'Complete Onboarding'}
          </Button>
        </div>
      </form>
    </div>
  )
}
