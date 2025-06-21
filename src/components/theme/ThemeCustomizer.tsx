'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette, Building2, Upload, Save, RotateCcw, X, Image } from 'lucide-react'
import { useFeatureFlag } from '@/components/FeatureFlagProvider'

interface Theme {
  companyName: string
  primaryColor: string
  secondaryColor: string
  logo?: string
}

export default function ThemeCustomizer() {
  const logoUploadEnabled = useFeatureFlag('LOGO_UPLOAD')
  
  const [theme, setTheme] = useState<Theme>({
    companyName: 'Rylie SEO Hub',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load current theme
  useEffect(() => {
    loadTheme()
  }, [])

  const loadTheme = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user/theme')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTheme(data.theme)
          applyTheme(data.theme)
        }
      }
    } catch (error) {
      console.error('Failed to load theme:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveTheme = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/user/theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(theme),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          applyTheme(data.theme)
          // Show success feedback
          console.log('Theme saved successfully!')
        }
      }
    } catch (error) {
      console.error('Failed to save theme:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const applyTheme = (themeData: Theme) => {
    // Apply CSS custom properties for real-time theming
    const root = document.documentElement
    root.style.setProperty('--primary', themeData.primaryColor)
    root.style.setProperty('--primary-foreground', '#ffffff')
    root.style.setProperty('--secondary', themeData.secondaryColor)
    root.style.setProperty('--secondary-foreground', '#ffffff')
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, and WebP images are allowed.')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 5MB.')
      return
    }

    try {
      setIsUploading(true)
      
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTheme({ ...theme, logo: data.data.url })
          console.log('Logo uploaded successfully!')
        } else {
          alert(data.error || 'Failed to upload logo')
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to upload logo')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload logo')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeLogo = () => {
    setTheme({ ...theme, logo: undefined })
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const resetToDefault = () => {
    const defaultTheme = {
      companyName: 'Rylie SEO Hub',
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      logo: undefined,
    }
    setTheme(defaultTheme)
    applyTheme(defaultTheme)
  }

  const presetThemes = [
    { name: 'Default Blue', primary: '#3b82f6', secondary: '#1e40af' },
    { name: 'Purple Pro', primary: '#8b5cf6', secondary: '#7c3aed' },
    { name: 'Green Growth', primary: '#10b981', secondary: '#059669' },
    { name: 'Red Power', primary: '#ef4444', secondary: '#dc2626' },
    { name: 'Orange Energy', primary: '#f97316', secondary: '#ea580c' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading theme settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8" />
            White-Label Theming
          </h1>
          <p className="text-muted-foreground mt-2">
            Customize your agency's branding and colors
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveTheme} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Theme'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Branding
            </CardTitle>
            <CardDescription>
              Customize your agency name and logo
        {/* Logo Upload */}
        {logoUploadEnabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Company Logo
              </CardTitle>
              <CardDescription>
                Upload your company logo to replace the default branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {theme.logo ? (
                  // Show current logo with option to change
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <img 
                      src={theme.logo} 
                      alt="Company Logo" 
                      className="h-12 w-auto max-w-[200px] object-contain"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Current Logo</p>
                      <p className="text-xs text-muted-foreground">Click to change or remove</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setTheme(prev => ({ ...prev, logo: undefined }))}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={triggerFileUpload}
                        disabled={isUploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Change Logo
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Show upload area
                  <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                    onClick={triggerFileUpload}
                  >
                    {isUploading ? (
                      <div className="space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Click to upload logo or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, WebP up to 5MB
                        </p>
                        <Button variant="outline" size="sm" className="mt-2" disabled={isUploading}>
                          Choose File
                        </Button>
                      </>
                    )}
                  </div>
                )}
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Color Customization */}
        <Card>
          <CardHeader>
            <CardTitle>Color Scheme</CardTitle>
            <CardDescription>
              Choose your brand colors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Primary Color
              </label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => {
                    const newTheme = { ...theme, primaryColor: e.target.value }
                    setTheme(newTheme)
                    applyTheme(newTheme)
                  }}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={theme.primaryColor}
                  onChange={(e) => {
                    const newTheme = { ...theme, primaryColor: e.target.value }
                    setTheme(newTheme)
                    applyTheme(newTheme)
                  }}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Secondary Color
              </label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.secondaryColor}
                  onChange={(e) => {
                    const newTheme = { ...theme, secondaryColor: e.target.value }
                    setTheme(newTheme)
                    applyTheme(newTheme)
                  }}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={theme.secondaryColor}
                  onChange={(e) => {
                    const newTheme = { ...theme, secondaryColor: e.target.value }
                    setTheme(newTheme)
                    applyTheme(newTheme)
                  }}
                  placeholder="#1e40af"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Quick Presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                {presetThemes.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTheme = {
                        ...theme,
                        primaryColor: preset.primary,
                        secondaryColor: preset.secondary,
                      }
                      setTheme(newTheme)
                      applyTheme(newTheme)
                    }}
                    className="justify-start"
                  >
                    <div
                      className="w-4 h-4 rounded mr-2"
                      style={{ backgroundColor: preset.primary }}
                    />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            See how your theme looks in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-background">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: theme.primaryColor }}>
                {theme.companyName}
              </h2>
              <Button style={{ backgroundColor: theme.primaryColor }}>
                Primary Button
              </Button>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded" />
              <div className="h-2 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-1/2" />
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" style={{ borderColor: theme.secondaryColor, color: theme.secondaryColor }}>
                Secondary
              </Button>
              <Button variant="ghost">
                Ghost Button
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

