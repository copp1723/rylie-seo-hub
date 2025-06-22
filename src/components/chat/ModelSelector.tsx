'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronDown, Check, Zap, DollarSign } from 'lucide-react'

interface AIModel {
  id: string
  name: string
  provider: string
  description: string
  maxTokens: number
  costPer1kTokens: number
}

interface ModelSelectorProps {
  models: AIModel[]
  selectedModel: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
}

export default function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  disabled = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const currentModel = models.find(m => m.id === selectedModel)

  if (models.length === 0) {
    return <div className="text-xs text-muted-foreground">Loading models...</div>
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <div className="flex items-center space-x-1">
          <Zap className="h-3 w-3" />
          <span>{currentModel?.name || 'Select Model'}</span>
          <ChevronDown className="h-3 w-3" />
        </div>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <Card className="absolute top-full left-0 mt-1 w-80 max-h-96 overflow-y-auto z-50 p-2">
            <div className="space-y-1">
              {models.map(model => (
                <Button
                  key={model.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 text-left"
                  onClick={() => {
                    onModelChange(model.id)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{model.name}</span>
                        {model.id === selectedModel && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
                      <div className="flex items-center space-x-3 mt-2">
                        <span className="text-xs text-muted-foreground">{model.provider}</span>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            ${model.costPer1kTokens.toFixed(4)}/1k tokens
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
