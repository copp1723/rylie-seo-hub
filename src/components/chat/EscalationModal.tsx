'use client'

import { useState } from 'react'
import { AlertCircle, Send, X } from 'lucide-react'

interface EscalationModalProps {
  isOpen: boolean
  onClose: () => void
  question: string
  aiResponse?: string
  onSubmit: (data: EscalationData) => Promise<void>
}

interface EscalationData {
  priority: string
  additionalContext: string
  contactPreference: 'email' | 'phone' | 'chat'
}

export function EscalationModal({ 
  isOpen, 
  onClose, 
  question, 
  aiResponse,
  onSubmit 
}: EscalationModalProps) {
  const [priority, setPriority] = useState('normal')
  const [additionalContext, setAdditionalContext] = useState('')
  const [contactPreference, setContactPreference] = useState<'email' | 'phone' | 'chat'>('email')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        priority,
        additionalContext,
        contactPreference
      })
      onClose()
    } catch (error) {
      console.error('Failed to escalate:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Send to SEO Team</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Show Original Question */}
          <div>
            <label className="text-sm font-medium text-gray-700">Your Question</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">{question}</p>
            </div>
          </div>

          {/* Priority Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700">How urgent is this?</label>
            <div className="mt-2 space-y-2">
              {[
                { value: 'low', label: 'Low - Can wait a few days' },
                { value: 'normal', label: 'Normal - Need help within 24 hours' },
                { value: 'high', label: 'High - Need help today' },
                { value: 'urgent', label: 'Urgent - Critical issue affecting business' }
              ].map((option) => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priority"
                    value={option.value}
                    checked={priority === option.value}
                    onChange={(e) => setPriority(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Context */}
          <div>
            <label htmlFor="context" className="text-sm font-medium text-gray-700">
              Additional Context (optional)
            </label>
            <textarea
              id="context"
              placeholder="Provide any additional details that might help our team..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Contact Preference */}
          <div>
            <label className="text-sm font-medium text-gray-700">Preferred contact method</label>
            <div className="mt-2 space-y-2">
              {[
                { value: 'email', label: 'Email response' },
                { value: 'phone', label: 'Phone call' },
                { value: 'chat', label: 'Continue in chat' }
              ].map((option) => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contactPreference"
                    value={option.value}
                    checked={contactPreference === option.value}
                    onChange={(e) => setContactPreference(e.target.value as any)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Info Message */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Our SEO team will review your question and respond based on your selected priority. 
              Typical response time is 2-4 hours during business hours.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to Team
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}