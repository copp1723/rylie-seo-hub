"use client"

import { cn } from "@/lib/utils"
import { CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"

interface ToastProps {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info'
  title?: string
  description?: string
  onClose?: () => void
  className?: string
}

const iconMap = {
  default: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const variantClasses = {
  default: "border-border bg-background text-foreground",
  success: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
  error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100", 
  warning: "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
}

export function Toast({ 
  variant = 'default', 
  title, 
  description, 
  onClose, 
  className 
}: ToastProps) {
  const Icon = iconMap[variant]
  
  return (
    <div 
      className={cn(
        "relative w-full rounded-lg border p-4 shadow-lg transition-all",
        variantClasses[variant],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {title && (
            <div className="font-medium text-sm mb-1">{title}</div>
          )}
          {description && (
            <div className="text-sm opacity-90">{description}</div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto flex-shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

export function useToast() {
  // Simple toast hook - for production you'd want a more sophisticated toast system
  const showToast = (props: Omit<ToastProps, 'onClose'>) => {
    // In a real implementation, this would add to a toast queue/context
    console.log('Toast:', props)
  }
  
  return { toast: showToast }
}