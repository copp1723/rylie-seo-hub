'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert } from '@/components/ui/alert'

interface SuperAdminDashboardProps {
  agencies: any[]
  users: any[]
  totalConversations: number
}

export function SuperAdminDashboard({ agencies: initialAgencies, users, totalConversations }: SuperAdminDashboardProps) {
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null)
  const [agencies, setAgencies] = useState(initialAgencies)
  const [showAddAgency, setShowAddAgency] = useState(false)
  const [newAgency, setNewAgency] = useState({
    name: '',
    slug: '',
    plan: 'starter'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const superAdminCount = users.filter(u => u.isSuperAdmin).length
  const totalUsers = users.length
  const totalAgencies = agencies.length
  
  const createAgency = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgency)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create agency')
      }
      
      // Add the new agency to the list
      setAgencies([data, ...agencies])
      setNewAgency({ name: '', slug: '', plan: 'starter' })
      setShowAddAgency(false)
      setSuccess('Agency created successfully!')
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agency')
    } finally {
      setLoading(false)
    }
  }
  
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide administration and monitoring</p>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <p className="text-green-800">{success}</p>
        </Alert>
      )}
      
      {/* Stats Overview */}
      <div className="dashboard-grid">
        <Card className="stat-card">
          <h3 className="text-sm font-medium text-muted-foreground">Total Agencies</h3>
          <p className="stat-value">{totalAgencies}</p>
        </Card>
        <Card className="stat-card">
          <h3 className="text-sm font-medium text-muted-foreground">Total Users</h3>
          <p className="stat-value">{totalUsers}</p>
        </Card>
        <Card className="stat-card">
          <h3 className="text-sm font-medium text-muted-foreground">Total Conversations</h3>
          <p className="stat-value">{totalConversations}</p>
        </Card>
        <Card className="stat-card">
          <h3 className="text-sm font-medium text-muted-foreground">Super Admins</h3>
          <p className="stat-value">{superAdminCount}</p>
        </Card>
      </div>
      
      <Tabs defaultValue="agencies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agencies">Agencies</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="ga4">GA4 Setup</TabsTrigger>
        </TabsList>
        
        <TabsContent value="agencies" className="space-y-4">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">All Agencies</h3>
                <Button onClick={() => setShowAddAgency(!showAddAgency)}>
                  {showAddAgency ? 'Cancel' : '+ Add Agency'}
                </Button>
              </div>
              
              {showAddAgency && (
                <form onSubmit={createAgency} className="mb-6 p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium">Create New Agency</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">Agency Name</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={newAgency.name}
                        onChange={(e) => {
                          setNewAgency({
                            ...newAgency,
                            name: e.target.value,
                            slug: generateSlug(e.target.value)
                          })
                        }}
                        placeholder="e.g. Acme Motors"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">URL Slug</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={newAgency.slug}
                        onChange={(e) => setNewAgency({ ...newAgency, slug: e.target.value })}
                        placeholder="e.g. acme-motors"
                        required
                      />
                      <p className="form-description">Used for custom URLs</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Plan</label>
                      <select
                        className="input w-full"
                        value={newAgency.plan}
                        onChange={(e) => setNewAgency({ ...newAgency, plan: e.target.value })}
                      >
                        <option value="starter">Starter</option>
                        <option value="growth">Growth</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Agency'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddAgency(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
              
              <div className="space-y-4">
                {agencies.map((agency) => (
                  <div key={agency.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{agency.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {agency._count?.users || 0} users • {agency._count?.conversations || 0} conversations
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {agency.id} • Slug: {agency.slug}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={agency.status === 'active' ? 'default' : 'secondary'}>
                          {agency.status}
                        </Badge>
                        <Badge variant="outline">{agency.plan}</Badge>
                        {agency.ga4PropertyId && (
                          <Badge variant="outline" className="bg-green-50">
                            GA4 Connected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">All Users</h3>
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.name || 'No name'} • {user.agency?.name || 'No agency'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.isSuperAdmin && (
                          <Badge variant="destructive">Super Admin</Badge>
                        )}
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="ga4" className="space-y-4">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">GA4 Integration Status</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Setup Instructions</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Enable Google Analytics Data API in Google Cloud Console</li>
                    <li>Update OAuth scopes to include analytics.readonly</li>
                    <li>Agencies can connect their GA4 properties from their settings</li>
                    <li>Use the GA4 data in chat responses for SEO insights</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Connected Properties</h4>
                  <div className="space-y-2">
                    {agencies.filter(a => a.ga4PropertyId).map((agency) => (
                      <div key={agency.id} className="border rounded p-3">
                        <p className="font-medium">{agency.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Property: {agency.ga4PropertyName || agency.ga4PropertyId}
                        </p>
                      </div>
                    ))}
                    {!agencies.some(a => a.ga4PropertyId) && (
                      <p className="text-sm text-muted-foreground">No agencies have connected GA4 yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}