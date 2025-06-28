'use client'

import React, { useState, useEffect } from 'react'
import { EnhancedOrderCard } from '@/components/orders/EnhancedOrderCard'
import { EnhancedOrderList } from '@/components/orders/EnhancedOrderList'
import { Loader2, TrendingUp, Clock, CheckCircle, AlertCircle, BarChart3, FileText, ExternalLink } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Order {
  id: string
  title: string
  description: string
  taskType: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'assigned' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  createdAt: string
  updatedAt: string
  assignedTo?: string
  assignedAt?: string
  estimatedHours?: number
  actualHours?: number
  pageTitle?: string
  contentUrl?: string
  taskCategory?: string
  keywords?: string[]
  targetUrl?: string
  wordCount?: number
  completedAt?: string
  userEmail: string
}

interface DashboardStats {
  totalTasks: number
  activeTasks: number
  completedThisWeek: number
  avgCompletionTime: number
  tasksByCategory: Record<string, number>
  tasksByStatus: Record<string, number>
  recentCompletions: Order[]
  urgentTasks: Order[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'all-tasks'>('overview')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/requests')
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()
      setOrders(data.orders)
      
      // Calculate statistics
      const stats = calculateStats(data.orders)
      setStats(stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (orders: Order[]): DashboardStats => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const completedThisWeek = orders.filter(o => 
      o.status === 'completed' && 
      o.completedAt && 
      new Date(o.completedAt) >= oneWeekAgo
    ).length

    const tasksByCategory = orders.reduce((acc, order) => {
      const category = order.taskCategory || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const tasksByStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const completedOrders = orders.filter(o => o.status === 'completed' && o.completedAt)
    const avgCompletionTime = completedOrders.length > 0
      ? completedOrders.reduce((sum, order) => {
          const created = new Date(order.createdAt).getTime()
          const completed = new Date(order.completedAt!).getTime()
          return sum + (completed - created) / (1000 * 60 * 60 * 24) // Convert to days
        }, 0) / completedOrders.length
      : 0

    const recentCompletions = orders
      .filter(o => o.status === 'completed')
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 5)

    const urgentTasks = orders
      .filter(o => 
        o.priority === 'high' && 
        ['pending', 'assigned', 'in_progress'].includes(o.status)
      )
      .slice(0, 5)

    return {
      totalTasks: orders.length,
      activeTasks: orders.filter(o => ['pending', 'assigned', 'in_progress', 'review'].includes(o.status)).length,
      completedThisWeek,
      avgCompletionTime,
      tasksByCategory,
      tasksByStatus,
      recentCompletions,
      urgentTasks
    }
  }

  const handleOrderClick = (order: Order) => {
    router.push(`/orders/${order.id}`)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SEO Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Track your content creation progress and manage tasks
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('all-tasks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all-tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Tasks ({orders.length})
            </button>
          </nav>
        </div>

        {activeTab === 'overview' && stats && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalTasks}</p>
                  </div>
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{stats.activeTasks}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-400" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed This Week</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{stats.completedThisWeek}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg. Completion</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">
                      {stats.avgCompletionTime.toFixed(1)}d
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Task Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Tasks by Category */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Tasks by Category
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.tasksByCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{category}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(count / stats.totalTasks) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks by Status */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Tasks by Status
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.tasksByStatus).map(([status, count]) => {
                    const statusColors: Record<string, string> = {
                      pending: 'bg-gray-600',
                      assigned: 'bg-indigo-600',
                      in_progress: 'bg-blue-600',
                      review: 'bg-purple-600',
                      completed: 'bg-green-600',
                      cancelled: 'bg-red-600'
                    }
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">
                          {status.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className={`${statusColors[status]} h-2 rounded-full`}
                              style={{
                                width: `${(count / stats.totalTasks) * 100}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Urgent Tasks and Recent Completions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Urgent Tasks */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Urgent Tasks
                </h3>
                {stats.urgentTasks.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
                    No urgent tasks at the moment
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.urgentTasks.map(order => (
                      <EnhancedOrderCard
                        key={order.id}
                        order={order}
                        onClick={() => handleOrderClick(order)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Completions */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Recent Completions
                </h3>
                {stats.recentCompletions.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
                    No completed tasks yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.recentCompletions.map(order => (
                      <div
                        key={order.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleOrderClick(order)}
                      >
                        <h4 className="font-medium text-gray-900 mb-1">
                          {order.pageTitle || order.title}
                        </h4>
                        {order.contentUrl && (
                          <a
                            href={order.contentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Content
                          </a>
                        )}
                        <p className="text-sm text-gray-600">
                          Completed {new Date(order.completedAt!).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'all-tasks' && (
          <EnhancedOrderList
            orders={orders}
            onOrderClick={handleOrderClick}
          />
        )}
      </div>
    </div>
  )
}