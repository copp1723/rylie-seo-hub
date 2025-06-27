'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Info, Save, RefreshCw } from 'lucide-react'
import { getContextCacheStats } from '@/lib/ai/contextCache'

interface AISettings {
  enableTaskContext: boolean
  contextDepth: number
  includeKeywords: boolean
  includeDealershipInfo: boolean
}

export default function AISettingsPage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<AISettings>({
    enableTaskContext: true,
    contextDepth: 30,
    includeKeywords: true,
    includeDealershipInfo: true,
  })
  const [saving, setSaving] = useState(false)
  const [cacheStats, setCacheStats] = useState({ size: 0, calculatedSize: 0 })

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('aiSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
    
    // Load cache stats
    setCacheStats(getContextCacheStats())
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save to localStorage for now
      localStorage.setItem('aiSettings', JSON.stringify(settings))
      
      // TODO: Save to database
      // await fetch('/api/settings/ai', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings),
      // })
      
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleClearCache = async () => {
    try {
      const response = await fetch('/api/ai/cache', { method: 'DELETE' })
      if (response.ok) {
        setCacheStats({ size: 0, calculatedSize: 0 })
        alert('Cache cleared successfully!')
      }
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">AI Assistant Settings</h1>

      <div className="bg-white rounded-lg shadow">
        {/* Task Context Settings */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Task Context</h2>
              <p className="text-sm text-gray-600 mt-1">
                Include completed tasks and SEO history in AI responses
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableTaskContext}
                onChange={(e) => setSettings({ ...settings, enableTaskContext: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.enableTaskContext && (
            <div className="mt-4 space-y-4">
              {/* Context Depth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Context Depth
                </label>
                <select
                  value={settings.contextDepth}
                  onChange={(e) => setSettings({ ...settings, contextDepth: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>Last 10 tasks</option>
                  <option value={20}>Last 20 tasks</option>
                  <option value={30}>Last 30 tasks</option>
                  <option value={50}>Last 50 tasks</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How many completed tasks to include in AI context
                </p>
              </div>

              {/* Include Keywords */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Include Target Keywords</p>
                  <p className="text-sm text-gray-600">
                    Share recent keywords with AI for better recommendations
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeKeywords}
                    onChange={(e) => setSettings({ ...settings, includeKeywords: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Include Dealership Info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Include Dealership Information</p>
                  <p className="text-sm text-gray-600">
                    Share business details for personalized advice
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeDealershipInfo}
                    onChange={(e) => setSettings({ ...settings, includeDealershipInfo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Cache Management */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">Cache Management</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Context Cache</p>
                <p className="text-sm text-gray-600">
                  {cacheStats.size} agencies cached
                </p>
              </div>
              <button
                onClick={handleClearCache}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Clear Cache
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-start gap-2">
            <Info className="h-4 w-4 text-gray-400 mt-0.5" />
            <p className="text-xs text-gray-600">
              Context is cached for 5 minutes to improve response times. Clear cache if you've made recent changes to tasks.
            </p>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="p-6 bg-blue-50">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Privacy & Security</h3>
              <p className="text-sm text-blue-800 mt-1">
                Your task data and business information are only used to enhance AI responses within your account. 
                This data is never shared with other users or used for training AI models.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}