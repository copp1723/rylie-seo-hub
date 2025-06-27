'use client'

import React, { useState, useMemo } from 'react'
import { EnhancedOrderCard } from './EnhancedOrderCard'
import { Search, Filter, ChevronDown, X } from 'lucide-react'

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

interface EnhancedOrderListProps {
  orders: Order[]
  onOrderClick?: (order: Order) => void
  className?: string
}

type SortOption = 'newest' | 'oldest' | 'priority' | 'status'

export function EnhancedOrderList({ orders, onOrderClick, className = '' }: EnhancedOrderListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showFilters, setShowFilters] = useState(false)

  // Extract unique categories from orders
  const categories = useMemo(() => {
    const cats = new Set<string>()
    orders.forEach(order => {
      if (order.taskCategory) cats.add(order.taskCategory)
    })
    return Array.from(cats).sort()
  }, [orders])

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          order.title.toLowerCase().includes(query) ||
          order.description.toLowerCase().includes(query) ||
          (order.pageTitle && order.pageTitle.toLowerCase().includes(query)) ||
          (order.taskCategory && order.taskCategory.toLowerCase().includes(query)) ||
          (order.keywords && order.keywords.some(k => k.toLowerCase().includes(query)))
        if (!matchesSearch) return false
      }

      // Category filter
      if (selectedCategory !== 'all' && order.taskCategory !== selectedCategory) {
        return false
      }

      // Status filter
      if (selectedStatus !== 'all' && order.status !== selectedStatus) {
        return false
      }

      // Priority filter
      if (selectedPriority !== 'all' && order.priority !== selectedPriority) {
        return false
      }

      return true
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        case 'status':
          const statusOrder = { 
            in_progress: 0, 
            review: 1, 
            assigned: 2, 
            pending: 3, 
            completed: 4, 
            cancelled: 5 
          }
          return statusOrder[a.status] - statusOrder[b.status]
        default:
          return 0
      }
    })

    return filtered
  }, [orders, searchQuery, selectedCategory, selectedStatus, selectedPriority, sortBy])

  const activeFiltersCount = [
    selectedCategory !== 'all',
    selectedStatus !== 'all',
    selectedPriority !== 'all'
  ].filter(Boolean).length

  const clearFilters = () => {
    setSelectedCategory('all')
    setSelectedStatus('all')
    setSelectedPriority('all')
    setSearchQuery('')
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filter Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, description, category, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle and Sort */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <div className="mt-3">
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {filteredOrders.length} of {orders.length} orders
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No orders found matching your criteria.</p>
          {(searchQuery || activeFiltersCount > 0) && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters and try again
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <EnhancedOrderCard
              key={order.id}
              order={order}
              onClick={() => onOrderClick?.(order)}
            />
          ))}
        </div>
      )}
    </div>
  )
}