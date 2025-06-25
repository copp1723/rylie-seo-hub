'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const router = useRouter()

  // Automatically redirect to dashboard since auth is disabled
  useEffect(() => {
    router.push('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="loading-spinner mx-auto"></div>
        <p className="text-muted-foreground">Redirecting to Dashboard...</p>
      </div>
    </div>
  )
}