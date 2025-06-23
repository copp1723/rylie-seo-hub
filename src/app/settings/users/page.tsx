'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  UserPlus, 
  Mail, 
  Shield, 
  Trash2, 
  Copy, 
  Check,
  AlertCircle,
  Users
} from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  isSuperAdmin: boolean
  role: string
  createdAt: string
  agency?: {
    id: string
    name: string
  }
}

interface Invite {
  id: string
  email: string
  role: string
  isSuperAdmin: boolean
  status: string
  invitedBy: {
    name: string | null
    email: string
  }
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
}

export default function UsersSettingsPage() {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteAsSuperAdmin, setInviteAsSuperAdmin] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUsers()
      fetchInvites()
    }
  }, [status])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/users/invite')
      if (res.ok) {
        const data = await res.json()
        setInvites(data.invites)
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error)
    }
  }

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setInviting(true)

    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          isSuperAdmin: inviteAsSuperAdmin,
          role: inviteAsSuperAdmin ? 'super_admin' : 'admin'
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(data.message)
        setInviteEmail('')
        setInviteAsSuperAdmin(false)
        fetchInvites()
        
        // Copy invite URL to clipboard
        if (data.invite?.inviteUrl) {
          await navigator.clipboard.writeText(data.invite.inviteUrl)
          setCopiedInvite(data.invite.id)
          setTimeout(() => setCopiedInvite(null), 2000)
        }
      } else {
        setError(data.error || 'Failed to send invite')
      }
    } catch (error) {
      setError('Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const toggleSuperAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          isSuperAdmin: !currentStatus
        })
      })

      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const res = await fetch(`/api/users?userId=${userId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  const copyInviteUrl = async (inviteId: string, token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(inviteUrl)
    setCopiedInvite(inviteId)
    setTimeout(() => setCopiedInvite(null), 2000)
  }

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (status === 'unauthenticated') {
    return <div className="flex items-center justify-center min-h-screen">Please sign in to access this page</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          User Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage users and send invitations for super admin access
        </p>
      </div>

      {/* Send Invite Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </CardTitle>
          <CardDescription>
            Send an invitation for someone to join with their Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendInvite} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="super-admin" className="text-base font-medium">
                  Grant Super Admin Access
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow full access to all features and settings
                </p>
              </div>
              <Switch
                id="super-admin"
                checked={inviteAsSuperAdmin}
                onCheckedChange={setInviteAsSuperAdmin}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            <Button type="submit" disabled={inviting}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Active Users</CardTitle>
          <CardDescription>
            Users who have signed in to the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {user.image && (
                    <img
                      src={user.image}
                      alt={user.name || user.email}
                      className="h-10 w-10 rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-medium">{user.name || user.email}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    {user.agency && (
                      <div className="text-xs text-muted-foreground">
                        Agency: {user.agency.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {user.isSuperAdmin && (
                    <Badge variant="default" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Super Admin
                    </Badge>
                  )}
                  
                  {user.email !== session?.user?.email && (
                    <>
                      <Switch
                        checked={user.isSuperAdmin}
                        onCheckedChange={() => toggleSuperAdmin(user.id, user.isSuperAdmin)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            Invitations that haven't been accepted yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invites
              .filter(invite => invite.status === 'pending')
              .map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {invite.email}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Invited by {invite.invitedBy.name || invite.invitedBy.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {invite.isSuperAdmin && (
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Super Admin
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyInviteUrl(invite.id, invite.id)}
                    >
                      {copiedInvite === invite.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}