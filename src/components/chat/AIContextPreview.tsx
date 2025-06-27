'use client'

import { useState } from 'react'
import { Info, CheckCircle, Package, Tag, Building2, X } from 'lucide-react'
import { TaskContext } from '@/lib/ai/taskContextService'

export function AIContextPreview() {
  const [context, setContext] = useState<TaskContext | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadContext = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/chat')
      if (response.ok) {
        const data = await response.json()
        setContext(data)
      }
    } catch (error) {
      console.error('Error loading context:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    loadContext()
    setIsOpen(true)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Info className="h-4 w-4" />
        What Rylie knows
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Rylie's Knowledge About Your SEO</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {loading ? (
                <div className="text-center py-8">
                  <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading context...</p>
                </div>
              ) : context ? (
                <div className="space-y-6">
                  {/* Dealership Info */}
                  {context.dealershipInfo && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="h-5 w-5 text-gray-600" />
                        <h3 className="font-semibold">Dealership Information</h3>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                        <p><span className="font-medium">Business:</span> {context.dealershipInfo.businessName}</p>
                        <p><span className="font-medium">Location:</span> {context.dealershipInfo.location}</p>
                        <p><span className="font-medium">Main Brand:</span> {context.dealershipInfo.mainBrand}</p>
                        {context.dealershipInfo.targetCities.length > 0 && (
                          <p><span className="font-medium">Target Cities:</span> {context.dealershipInfo.targetCities.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Package Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold">Package Status</h3>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">{context.packageInfo.type} Package</span>
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${context.packageInfo.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600">
                        {context.packageInfo.progress}% complete • {context.packageInfo.remainingTasks} tasks remaining
                      </p>
                    </div>
                  </div>

                  {/* Recent Content */}
                  {context.completedTasks.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold">Recent Completed Content</h3>
                      </div>
                      <div className="space-y-2">
                        {context.completedTasks.map((task, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium">{task.title}</p>
                              <p className="text-xs text-gray-500">
                                {task.type} • {new Date(task.completedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Keywords */}
                  {context.recentKeywords.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="h-5 w-5 text-gray-600" />
                        <h3 className="font-semibold">Target Keywords</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {context.recentKeywords.map((keyword, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Work */}
                  {context.activeTaskTypes.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Currently Working On</h3>
                      <div className="flex flex-wrap gap-2">
                        {context.activeTaskTypes.map((type, i) => (
                          <span 
                            key={i}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800"
                          >
                            {type} content
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No context available</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <p className="text-xs text-gray-600 text-center">
                This information helps Rylie provide more relevant and personalized SEO advice
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}