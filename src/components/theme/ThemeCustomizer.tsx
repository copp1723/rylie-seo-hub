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
          applyTheme(theme)
          // Show success message
        }
      }
    } catch (error) {
      console.error('Failed to save theme:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const applyTheme = (themeData: Theme) => {
    const root = document.documentElement
    root.style.setProperty('--primary', themeData.primaryColor)
    root.style.setProperty('--secondary', themeData.secondaryColor)
  }

  const resetToDefault = () => {
    const defaultTheme = {
      companyName: 'Rylie SEO Hub',
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
    }
    setTheme(defaultTheme)
    applyTheme(defaultTheme)
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTheme(prev => ({ ...prev, logo: data.url }))
        }
      }
    } catch (error) {
      console.error('Failed to upload logo:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const removeLogo = () => {
    setTheme(prev => ({ ...prev, logo: undefined }))
  }

  const colorPresets = [
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
            Customize your agency&apos;s branding and colors
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Branding
            </CardTitle>
            <CardDescription>Set your agency&apos;s name and visual identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Company Name</label>
              <Input
                value={theme.companyName}
                onChange={e => setTheme(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Your Agency Name"
              />
            </div>

            {logoUploadEnabled && (
              <div>
                <label className="text-sm font-medium mb-2 block">Company Logo</label>
                {theme.logo ? (
                  <div className="relative inline-block">
                    <img
                      src={theme.logo}
                      alt="Company Logo"
                      className="h-20 w-auto border rounded-lg"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={removeLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Upload your logo</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Choose File'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Color Scheme
            </CardTitle>
            <CardDescription>Choose colors that match your brand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Primary Color</label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.primaryColor}
                  onChange={e => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={theme.primaryColor}
                  onChange={e => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Secondary Color</label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.secondaryColor}
                  onChange={e => setTheme(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={theme.secondaryColor}
                  onChange={e => setTheme(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  placeholder="#1e40af"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Color Presets</label>
              <div className="grid grid-cols-2 gap-2">
                {colorPresets.map(preset => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTheme(prev => ({
                        ...prev,
                        primaryColor: preset.primary,
                        secondaryColor: preset.secondary,
                      }))
                    }
                    className="justify-start"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span className="text-xs">{preset.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>See how your branding will look</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border rounded-lg p-6 bg-gradient-to-br from-background to-muted"
            style={{
              borderColor: theme.primaryColor + '20',
              background: `linear-gradient(135deg, ${theme.primaryColor}10, ${theme.secondaryColor}10)`,
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              {theme.logo && <img src={theme.logo} alt="Logo" className="h-8 w-auto" />}
              <h2 className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                {theme.companyName}
              </h2>
            </div>
            <p className="text-muted-foreground mb-4">
              AI-Powered SEO Assistant for Modern Agencies
            </p>
            <div className="flex gap-2">
              <Button style={{ backgroundColor: theme.primaryColor }}>Get Started</Button>
              <Button
                variant="outline"
                style={{ borderColor: theme.secondaryColor, color: theme.secondaryColor }}
              >
                Learn More
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
