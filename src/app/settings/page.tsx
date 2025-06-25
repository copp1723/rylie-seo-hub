'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/')
    }
  }, [status])

  useEffect(() => {
    async function fetchUserDetails() {
      try {
        const response = await fetch('/api/user/details')
        if (response.ok) {
          const data = await response.json()
          setUserDetails(data)
        }
      } catch (error) {
        console.error('Error fetching user details:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchUserDetails()
    }
  }, [session])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

        {/* User Information */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
                  <span className="text-2xl font-medium">
                    {session.user.name?.charAt(0) || session.user.email?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-lg">{session.user.name || 'User'}</p>
                <p className="text-muted-foreground">{session.user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-sm">{session.user.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Authentication Provider</p>
                <p className="text-sm">Google OAuth</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Agency Information */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Agency Information</h2>
          {userDetails?.agency ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Agency Name</p>
                  <p className="font-medium">{userDetails.agency.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agency ID</p>
                  <p className="font-mono text-sm">{userDetails.agency.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <Badge variant="default">{userDetails.agency.plan}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={userDetails.agency.status === 'active' ? 'default' : 'secondary'}>
                    {userDetails.agency.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Role</p>
                  <Badge variant="outline">{userDetails.role || 'user'}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Conversations</p>
                  <p className="text-sm">{userDetails.agency.maxConversations}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">You are not associated with any agency.</p>
              <p className="text-sm text-muted-foreground">
                To use the chat features, you need to be assigned to an agency. Please contact your
                administrator.
              </p>
            </div>
          )}
        </Card>

        {/* Permissions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Permissions</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Super Admin</span>
              <Badge variant={userDetails?.isSuperAdmin ? 'default' : 'secondary'}>
                {userDetails?.isSuperAdmin ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Agency Admin</span>
              <Badge variant={userDetails?.role === 'admin' ? 'default' : 'secondary'}>
                {userDetails?.role === 'admin' ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
