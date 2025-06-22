'use client'

import { FeatureFlagDashboard } from '@/components/admin/FeatureFlagDashboard'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminPage() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      redirect('/')
      return
    }

    // For now, allow all authenticated users to access admin
    // In production, you might want to restrict this to specific users
    const isAdmin = session.user?.email?.includes('@atsglobal.ai') || false

    if (!isAdmin) {
      // For demo purposes, we'll allow all users to access admin features
      // In production, uncomment the line below to restrict access
      // redirect('/chat');
    }
  }, [session, status])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <FeatureFlagDashboard />
      </div>
    </div>
  )
}
