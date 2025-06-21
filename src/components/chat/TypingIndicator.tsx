'use client'

import { Card } from '@/components/ui/card'
import { Bot } from 'lucide-react'

export default function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-start space-x-2 max-w-[85%]">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Typing Animation */}
        <Card className="bg-muted text-muted-foreground p-3">
          <div className="flex items-center space-x-1">
            <span className="text-sm">Rylie is thinking</span>
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
