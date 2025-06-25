'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InviteUserSection } from './InviteUserSection'

interface SuperAdminDashboardProps {
  agencies: any[]
  users: any[]
  totalConversations: number
}

export function SuperAdminDashboard({
  agencies,
  users,
  totalConversations,
}: SuperAdminDashboardProps) {
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null)

  const superAdminCount = users.filter(u => u.isSuperAdmin).length
  const totalUsers = users.length
  const totalAgencies = agencies.length

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide administration and monitoring</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Agencies</h3>
          <p className="text-2xl font-bold mt-2">{totalAgencies}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Users</h3>
          <p className="text-2xl font-bold mt-2">{totalUsers}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Conversations</h3>
          <p className="text-2xl font-bold mt-2">{totalConversations}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Super Admins</h3>
          <p className="text-2xl font-bold mt-2">{superAdminCount}</p>
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
              <h3 className="text-lg font-semibold mb-4">All Agencies</h3>
              <div className="space-y-4">
                {agencies.map(agency => (
                  <div key={agency.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{agency.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {agency._count.users} users • {agency._count.conversations} conversations
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
          <InviteUserSection onInviteSuccess={() => window.location.reload()} />
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">All Users</h3>
              <div className="space-y-2">
                {users.map(user => (
                  <div key={user.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.name || 'No name'} • {user.agency?.name || 'No agency'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.isSuperAdmin && <Badge variant="destructive">Super Admin</Badge>}
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
                    {agencies
                      .filter(a => a.ga4PropertyId)
                      .map(agency => (
                        <div key={agency.id} className="border rounded p-3">
                          <p className="font-medium">{agency.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Property: {agency.ga4PropertyName || agency.ga4PropertyId}
                          </p>
                        </div>
                      ))}
                    {!agencies.some(a => a.ga4PropertyId) && (
                      <p className="text-sm text-muted-foreground">
                        No agencies have connected GA4 yet
                      </p>
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
