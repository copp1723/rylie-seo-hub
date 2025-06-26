'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { RefreshCw, Play, Pause, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface FailedExecution {
  id: string
  scheduleId: string
  status: string
  attemptCount: number
  failedAt: string
  error: string
  errorCode: string
  retryAfter: string | null
  canRetry: boolean
  schedule: {
    id: string
    reportType: string
    ga4PropertyId: string
    isPaused: boolean
    consecutiveFailures: number
    user: {
      id: string
      email: string
      name: string | null
    }
    agency: {
      id: string
      name: string
    }
  }
}

interface FailedReportsTableProps {
  executions: FailedExecution[]
  onRetry: (executionId: string) => Promise<void>
  onPauseSchedule: (scheduleId: string, reason?: string) => Promise<void>
  onResumeSchedule: (scheduleId: string) => Promise<void>
}

export function FailedReportsTable({
  executions,
  onRetry,
  onPauseSchedule,
  onResumeSchedule
}: FailedReportsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<{ [key: string]: { type: 'success' | 'error', text: string } }>({})

  const toggleExpanded = (executionId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(executionId)) {
      newExpanded.delete(executionId)
    } else {
      newExpanded.add(executionId)
    }
    setExpandedRows(newExpanded)
  }

  const showMessage = (key: string, type: 'success' | 'error', text: string) => {
    setMessages({ ...messages, [key]: { type, text } })
    setTimeout(() => {
      setMessages(prev => {
        const newMessages = { ...prev }
        delete newMessages[key]
        return newMessages
      })
    }, 5000)
  }

  const handleRetry = async (execution: FailedExecution) => {
    setLoadingActions(new Set([...loadingActions, execution.id]))
    try {
      await onRetry(execution.id)
      showMessage(execution.id, 'success', `Report retry has been started for ${execution.schedule.reportType}`)
    } catch (error) {
      showMessage(execution.id, 'error', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoadingActions(new Set([...loadingActions].filter(id => id !== execution.id)))
    }
  }

  const handleTogglePause = async (execution: FailedExecution) => {
    const actionId = `pause-${execution.schedule.id}`
    setLoadingActions(new Set([...loadingActions, actionId]))
    
    try {
      if (execution.schedule.isPaused) {
        await onResumeSchedule(execution.schedule.id)
        showMessage(actionId, 'success', 'The report schedule has been resumed')
      } else {
        await onPauseSchedule(execution.schedule.id, 'Paused due to repeated failures')
        showMessage(actionId, 'success', 'The report schedule has been paused')
      }
    } catch (error) {
      showMessage(actionId, 'error', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoadingActions(new Set([...loadingActions].filter(id => id !== actionId)))
    }
  }

  const getErrorBadgeVariant = (errorCode: string) => {
    switch (errorCode) {
      case 'OAUTH_EXPIRED':
      case 'OAUTH_INVALID':
        return 'destructive'
      case 'API_RATE_LIMIT':
      case 'API_QUOTA_EXCEEDED':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left text-sm font-medium w-10"></th>
                <th className="p-2 text-left text-sm font-medium">Report Type</th>
                <th className="p-2 text-left text-sm font-medium">Agency</th>
                <th className="p-2 text-left text-sm font-medium">User</th>
                <th className="p-2 text-left text-sm font-medium">Failed At</th>
                <th className="p-2 text-left text-sm font-medium">Error</th>
                <th className="p-2 text-left text-sm font-medium">Attempts</th>
                <th className="p-2 text-left text-sm font-medium">Status</th>
                <th className="p-2 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((execution) => (
                <>
                  <tr key={execution.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(execution.id)}
                        className="h-8 w-8 p-0"
                      >
                        {expandedRows.has(execution.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                    <td className="p-2 font-medium">
                      {execution.schedule.reportType}
                    </td>
                    <td className="p-2">{execution.schedule.agency.name}</td>
                    <td className="p-2">
                      <div className="text-sm">
                        <div>{execution.schedule.user.name || execution.schedule.user.email}</div>
                        <div className="text-muted-foreground text-xs">{execution.schedule.user.email}</div>
                      </div>
                    </td>
                    <td className="p-2 text-sm">
                      {format(new Date(execution.failedAt), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="p-2">
                      <Badge variant={getErrorBadgeVariant(execution.errorCode) as any}>
                        {execution.errorCode}
                      </Badge>
                    </td>
                    <td className="p-2 text-sm">
                      {execution.attemptCount} / 3
                    </td>
                    <td className="p-2">
                      {execution.schedule.isPaused && (
                        <Badge variant="warning">Schedule Paused</Badge>
                      )}
                      {execution.retryAfter && new Date(execution.retryAfter) > new Date() && (
                        <Badge variant="secondary">
                          Retry at {format(new Date(execution.retryAfter), 'HH:mm')}
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-2">
                        {execution.canRetry && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(execution)}
                            disabled={loadingActions.has(execution.id)}
                          >
                            {loadingActions.has(execution.id) ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Retry
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTogglePause(execution)}
                          disabled={loadingActions.has(`pause-${execution.schedule.id}`)}
                        >
                          {execution.schedule.isPaused ? (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Resume
                            </>
                          ) : (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(execution.id) && (
                    <tr key={`${execution.id}-expanded`}>
                      <td colSpan={9} className="bg-muted/30 p-0">
                        <div className="p-4 space-y-3">
                          <div>
                            <h4 className="font-semibold text-sm mb-1">Error Details</h4>
                            <pre className="text-xs bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap">
                              {execution.error}
                            </pre>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Schedule ID:</span> {execution.scheduleId}
                            </div>
                            <div>
                              <span className="font-medium">GA4 Property:</span> {execution.schedule.ga4PropertyId}
                            </div>
                            <div>
                              <span className="font-medium">Consecutive Failures:</span> {execution.schedule.consecutiveFailures}
                            </div>
                            <div>
                              <span className="font-medium">Execution ID:</span> {execution.id}
                            </div>
                          </div>
                          {messages[execution.id] && (
                            <div className={`p-2 rounded text-sm ${
                              messages[execution.id].type === 'success' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {messages[execution.id].text}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}