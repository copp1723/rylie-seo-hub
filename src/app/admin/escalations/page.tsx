'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, User, Clock, CheckCircle } from 'lucide-react'

interface Escalation {
  id: string
  originalQuestion: string
  aiResponse?: string
  userContext?: string
  status: string
  priority: string
  assignedTo?: string
  assignedAt?: string
  resolution?: string
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
  user: {
    name: string
    email: string
  }
}

export default function EscalationsAdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [filter, setFilter] = useState('pending')
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is admin
    if (session && !session.user?.isSuperAdmin) {
      router.push('/dashboard')
    }
  }, [session, router])

  useEffect(() => {
    fetchEscalations()
  }, [filter])

  const fetchEscalations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/escalations?status=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setEscalations(data.escalations)
      }
    } catch (error) {
      console.error('Error fetching escalations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (escalationId: string) => {
    try {
      const response = await fetch('/api/escalations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escalationId,
          status: 'assigned',
          assignedTo: session?.user?.email,
        }),
      })

      if (response.ok) {
        fetchEscalations()
      }
    } catch (error) {
      console.error('Error assigning escalation:', error)
    }
  }

  const handleResolve = async (escalationId: string, resolution: string) => {
    try {
      const response = await fetch('/api/escalations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escalationId,
          resolution,
        }),
      })

      if (response.ok) {
        fetchEscalations()
        setSelectedEscalation(null)
      }
    } catch (error) {
      console.error('Error resolving escalation:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'normal': return 'text-blue-600 bg-blue-50'
      case 'low': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4" />
      case 'assigned': return <User className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      case 'resolved': return <CheckCircle className="h-4 w-4" />
      default: return null
    }
  }

  const filteredEscalations = escalations

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading escalations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">SEO Team Escalations</h1>
      
      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['pending', 'assigned', 'in_progress', 'resolved'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            {' '}({escalations.filter(e => e.status === status).length})
          </button>
        ))}
      </div>

      {/* Escalations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Question
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEscalations.map((escalation) => (
              <tr key={escalation.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(escalation.priority)}`}>
                    {escalation.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{escalation.user.name}</p>
                    <p className="text-gray-500">{escalation.user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900 truncate max-w-md">
                    {escalation.originalQuestion}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDistanceToNow(new Date(escalation.createdAt), { addSuffix: true })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-sm">
                    {getStatusIcon(escalation.status)}
                    {escalation.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => setSelectedEscalation(escalation)}
                    className="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    View
                  </button>
                  {escalation.status === 'pending' && (
                    <button
                      onClick={() => handleAssign(escalation.id)}
                      className="ml-3 text-green-600 hover:text-green-900 font-medium"
                    >
                      Assign to Me
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedEscalation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Escalation Details</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700">User Question</h3>
                  <p className="mt-1 text-gray-900">{selectedEscalation.originalQuestion}</p>
                </div>

                {selectedEscalation.aiResponse && (
                  <div>
                    <h3 className="font-medium text-gray-700">AI Response</h3>
                    <p className="mt-1 text-gray-600 whitespace-pre-wrap">
                      {selectedEscalation.aiResponse}
                    </p>
                  </div>
                )}

                {selectedEscalation.userContext && (
                  <div>
                    <h3 className="font-medium text-gray-700">Additional Context</h3>
                    <p className="mt-1 text-gray-600">{selectedEscalation.userContext}</p>
                  </div>
                )}

                {selectedEscalation.status !== 'resolved' && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Resolution</h3>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="Enter your resolution..."
                      id="resolution-textarea"
                    />
                  </div>
                )}

                {selectedEscalation.resolution && (
                  <div>
                    <h3 className="font-medium text-gray-700">Resolution</h3>
                    <p className="mt-1 text-gray-600">{selectedEscalation.resolution}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Resolved by {selectedEscalation.resolvedBy} {' '}
                      {selectedEscalation.resolvedAt && 
                        formatDistanceToNow(new Date(selectedEscalation.resolvedAt), { addSuffix: true })
                      }
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedEscalation(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Close
                </button>
                {selectedEscalation.status !== 'resolved' && (
                  <button
                    onClick={() => {
                      const textarea = document.getElementById('resolution-textarea') as HTMLTextAreaElement
                      if (textarea?.value) {
                        handleResolve(selectedEscalation.id, textarea.value)
                      }
                    }}
                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}