'use client'

import React from 'react'
import { AnalyticsResponse } from '@/lib/analytics/types'
import { ChartVisualization } from '@/components/analytics/ChartVisualization'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BarChart3, MessageSquare, HelpCircle } from 'lucide-react'

interface AnalyticsBubbleProps {
  response: AnalyticsResponse
  timestamp?: Date
  onFollowUpClick?: (question: string) => void
  className?: string
}

export function AnalyticsBubble({
  response,
  timestamp = new Date(),
  onFollowUpClick,
  className = ''
}: AnalyticsBubbleProps) {
  const { text, visualizations, followUpQuestions } = response

  // Handle follow-up question click
  const handleFollowUpClick = (question: string) => {
    if (onFollowUpClick) {
      onFollowUpClick(question)
    }
  }

  return (
    <div className={`bg-muted rounded-lg p-4 max-w-[90%] ${className}`}>
      {/* Header with analytics icon */}
      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
        <BarChart3 className="h-4 w-4" />
        <span className="font-medium">Analytics Insight</span>
      </div>

      {/* Main text response */}
      <div className="whitespace-pre-wrap mb-4">{text}</div>

      {/* Visualizations */}
      {visualizations && visualizations.length > 0 && (
        <div className="space-y-4 my-4">
          {visualizations.map((viz, index) => (
            <ChartVisualization 
              key={index} 
              visualization={viz} 
              className="bg-white border border-gray-100"
              height={250}
            />
          ))}
        </div>
      )}

      {/* Follow-up questions */}
      {followUpQuestions && followUpQuestions.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <HelpCircle className="h-3 w-3" />
            <span>Follow-up questions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {followUpQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs bg-white"
                onClick={() => handleFollowUpClick(question)}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs opacity-70 mt-4">
        {timestamp.toLocaleTimeString()}
      </p>
    </div>
  )
}
