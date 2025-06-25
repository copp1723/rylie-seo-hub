'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface InviteUserSectionProps {
  onInviteSuccess?: () => void
}

export function InviteUserSection({ onInviteSuccess }: InviteUserSectionProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'user' | 'admin' | 'super_admin'>('user')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role: isSuperAdmin ? 'super_admin' : role,
          isSuperAdmin,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || `Invitation sent to ${email}` })
        setEmail('')
        setRole('user')
        setIsSuperAdmin(false)
        onInviteSuccess?.()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send invitation' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error - please try again' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Invite New User</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium mb-1">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={e => setRole(e.target.value as any)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isSuperAdmin}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="super-admin"
            type="checkbox"
            checked={isSuperAdmin}
            onChange={e => {
              setIsSuperAdmin(e.target.checked)
              if (e.target.checked) setRole('super_admin')
            }}
            className="rounded"
          />
          <label htmlFor="super-admin" className="text-sm">
            Make this user a Super Admin
          </label>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Sending...' : 'Send Invitation'}
        </Button>
      </form>

      {message && (
        <div
          className={`mt-4 p-3 rounded ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </Card>
  )
}
