'use client'

import React, { useState, useEffect } from 'react'
import { EnhancedOrderList } from '@/components/orders/EnhancedOrderList'
import { Loader2 } from 'lucide-react'
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

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchOrders()
    }
  }, [session])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/orders')
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()
      setOrders(data.orders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleOrderClick = (order: Order) => {
    // Navigate to order detail page or open modal
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
            onClick={fetchOrders}
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
          <h1 className="text-3xl font-bold text-gray-900">SEO Tasks</h1>
          <p className="mt-2 text-gray-600">
            Manage and track your SEO content creation tasks
          </p>
        </div>

        {/* Active Tasks Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-600">Total Tasks</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-600">In Progress</h3>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {orders.filter(o => o.status === 'in_progress').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-600">Pending Review</h3>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {orders.filter(o => o.status === 'review').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-600">Completed</h3>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {orders.filter(o => o.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Orders List */}
        <EnhancedOrderList
          orders={orders}
          onOrderClick={handleOrderClick}
        />
      </div>
    </div>
  )
}