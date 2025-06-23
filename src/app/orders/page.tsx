'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sidebar } from '@/components/chat/Sidebar'
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Eye,
  FileText,
  Globe,
  Wrench,
  Search,
  Star
} from 'lucide-react'

interface Deliverable {
  type: string
  title: string
  fileUrl?: string
  metadata?: Record<string, any>
}

interface Order {
  id: string
  taskType: 'blog' | 'page' | 'gbp' | 'maintenance' | 'seo'
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  requestedAt: string
  completedAt?: string
  assignedTo?: string
  estimatedHours?: number
  actualHours?: number
  deliverables?: Deliverable[]
  completionNotes?: string
  qualityScore?: number
}

const taskTypeIcons = {
  blog: FileText,
  page: Globe,
  gbp: Search,
  maintenance: Wrench,
  seo: Search
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/')
    }
  }, [status])

  useEffect(() => {
    if (session) {
      loadOrders()
    }
  }, [session])

  const loadOrders = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTaskTypeLabel = (type: string) => {
    const labels = {
      blog: 'Blog Post',
      page: 'Page Content',
      gbp: 'Google Business Profile',
      maintenance: 'Site Maintenance',
      seo: 'SEO Optimization'
    }
    return labels[type as keyof typeof labels] || type
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto"></div>
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar user={session.user} />
      
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-card border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Package className="h-8 w-8" />
                Orders
              </h1>
              <p className="text-muted-foreground mt-1">
                Track your SEO service requests and deliverables
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{orders.length} Total Orders</p>
                <p className="text-sm text-muted-foreground">
                  {orders.filter(o => o.status === 'completed').length} Completed
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Orders Grid */}
      <div className="container mx-auto px-4 py-8">
        {orders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground mb-4">
                Submit a request through the chat to get started
              </p>
              <Button onClick={() => window.location.href = '/chat'}>
                Go to Chat
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(order => {
              const Icon = taskTypeIcons[order.taskType] || Package
              return (
                <Card 
                  key={order.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{order.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {getTaskTypeLabel(order.taskType)}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={statusColors[order.status]}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {order.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(order.requestedAt).toLocaleDateString()}</span>
                      </div>
                      {order.estimatedHours && (
                        <span className="text-muted-foreground">
                          Est. {order.estimatedHours}h
                        </span>
                      )}
                    </div>

                    {order.deliverables && order.deliverables.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          {order.deliverables.length} Deliverable{order.deliverables.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {order.qualityScore && (
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-4 w-4 ${i < (order.qualityScore || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedOrder.title}</CardTitle>
                  <CardDescription>
                    {getTaskTypeLabel(selectedOrder.taskType)} • Order #{selectedOrder.id.slice(0, 8)}
                  </CardDescription>
                </div>
                <Badge className={statusColors[selectedOrder.status]}>
                  {selectedOrder.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-muted-foreground">{selectedOrder.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Requested</h4>
                  <p className="text-muted-foreground">
                    {new Date(selectedOrder.requestedAt).toLocaleString()}
                  </p>
                </div>
                {selectedOrder.completedAt && (
                  <div>
                    <h4 className="font-semibold mb-1">Completed</h4>
                    <p className="text-muted-foreground">
                      {new Date(selectedOrder.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedOrder.assignedTo && (
                <div>
                  <h4 className="font-semibold mb-1">Assigned To</h4>
                  <p className="text-muted-foreground">{selectedOrder.assignedTo}</p>
                </div>
              )}

              {(selectedOrder.estimatedHours || selectedOrder.actualHours) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedOrder.estimatedHours && (
                    <div>
                      <h4 className="font-semibold mb-1">Estimated Hours</h4>
                      <p className="text-muted-foreground">{selectedOrder.estimatedHours}h</p>
                    </div>
                  )}
                  {selectedOrder.actualHours && (
                    <div>
                      <h4 className="font-semibold mb-1">Actual Hours</h4>
                      <p className="text-muted-foreground">{selectedOrder.actualHours}h</p>
                    </div>
                  )}
                </div>
              )}

              {selectedOrder.completionNotes && (
                <div>
                  <h4 className="font-semibold mb-2">Completion Notes</h4>
                  <p className="text-muted-foreground">{selectedOrder.completionNotes}</p>
                </div>
              )}

              {selectedOrder.deliverables && selectedOrder.deliverables.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Deliverables</h4>
                  <div className="space-y-2">
                    {selectedOrder.deliverables.map((deliverable, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{deliverable.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Type: {deliverable.type}
                              {deliverable.metadata?.wordCount && ` • ${deliverable.metadata.wordCount} words`}
                              {deliverable.metadata?.seoScore && ` • SEO Score: ${deliverable.metadata.seoScore}`}
                            </p>
                          </div>
                        </div>
                        {deliverable.fileUrl && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <a href={deliverable.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </a>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a href={deliverable.fileUrl} download>
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  )
}