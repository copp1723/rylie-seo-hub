'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  MapPin, 
  Car, 
  Building2, 
  Target,
  AlertCircle,
  Send,
  Loader2
} from 'lucide-react'

interface RequestFormProps {
  onSubmit: (data: RequestData) => void
  isLoading?: boolean
}

export interface RequestData {
  targetCities?: string
  targetModels?: string
  competitorDealerships?: string
  marketSpecifics?: string
  additionalFocus?: string
}

export function RequestForm({ onSubmit, isLoading = false }: RequestFormProps) {
  const [formData, setFormData] = useState<RequestData>({
    targetCities: '',
    targetModels: '',
    competitorDealerships: '',
    marketSpecifics: '',
    additionalFocus: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (field: keyof RequestData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Monthly SEO Focus Request
        </CardTitle>
        <CardDescription className="text-base">
          Please send us any specific target requests for this month. This is optional but helps us ensure we are aligned with your dealership goals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alert Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">How this helps:</p>
              <p>While we handle your monthly content planning and SEO strategy, your input helps us prioritize areas that matter most to your dealership right now.</p>
            </div>
          </div>

          {/* Target Cities */}
          <div className="space-y-2">
            <Label htmlFor="targetCities" className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              What are your top target areas/cities that you want to rank for?
            </Label>
            <Textarea
              id="targetCities"
              placeholder="e.g., Kansas City, Overland Park, Olathe, Independence..."
              value={formData.targetCities}
              onChange={handleChange('targetCities')}
              className="min-h-[80px]"
            />
            <p className="text-sm text-muted-foreground">
              List the cities or areas where you want to improve your search visibility
            </p>
          </div>

          {/* Target Models */}
          <div className="space-y-2">
            <Label htmlFor="targetModels" className="text-base font-semibold flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" />
              What are your top target model priorities?
            </Label>
            <Textarea
              id="targetModels"
              placeholder="e.g., 2025 Ford F-150, Chevrolet Silverado, Toyota Camry..."
              value={formData.targetModels}
              onChange={handleChange('targetModels')}
              className="min-h-[80px]"
            />
            <p className="text-sm text-muted-foreground">
              Which vehicle models should we focus on for content and SEO?
            </p>
          </div>

          {/* Competitor Dealerships */}
          <div className="space-y-2">
            <Label htmlFor="competitorDealerships" className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              What dealerships do you want to target for organic placement?
            </Label>
            <Textarea
              id="competitorDealerships"
              placeholder="e.g., ABC Motors, XYZ Auto Group..."
              value={formData.competitorDealerships}
              onChange={handleChange('competitorDealerships')}
              className="min-h-[80px]"
            />
            <p className="text-sm text-muted-foreground">
              Name competitors you'd like to outrank in search results
            </p>
          </div>

          {/* Market Specifics */}
          <div className="space-y-2">
            <Label htmlFor="marketSpecifics" className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Is there anything you want to make sure we know about your market specifically?
            </Label>
            <Textarea
              id="marketSpecifics"
              placeholder="e.g., We're the only dealership offering electric vehicle charging stations, We specialize in commercial fleet sales..."
              value={formData.marketSpecifics}
              onChange={handleChange('marketSpecifics')}
              className="min-h-[100px]"
            />
            <p className="text-sm text-muted-foreground">
              Share any unique aspects about your market, specializations, or competitive advantages
            </p>
          </div>

          {/* Additional Focus Areas */}
          <div className="space-y-2">
            <Label htmlFor="additionalFocus" className="text-base font-semibold">
              Any additional focus areas or requests for this month?
            </Label>
            <Textarea
              id="additionalFocus"
              placeholder="Optional: Any other priorities or special requests..."
              value={formData.additionalFocus}
              onChange={handleChange('additionalFocus')}
              className="min-h-[80px]"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button 
              type="submit" 
              size="lg" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Monthly Focus Request
                </>
              )}
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-sm text-center text-muted-foreground pt-2">
            This information helps us create targeted content that drives results for your dealership.
            You'll receive a confirmation once we've reviewed your request.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
