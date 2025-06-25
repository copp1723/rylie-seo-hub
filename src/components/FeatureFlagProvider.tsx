'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FeatureFlagContext, featureFlags } from '@/lib/feature-flags'

interface FeatureFlagProviderProps {
  children: React.ReactNode
}

interface FeatureFlagContextValue {
  isEnabled: (flagKey: string) => boolean
  getEnabledFlags: () => string[]
  refreshFlags: () => Promise<void>
  loading: boolean
}

const FeatureFlagReactContext = createContext<FeatureFlagContextValue | undefined>(undefined)

export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [flagContext, setFlagContext] = useState<FeatureFlagContext>({})

  // Update flag context when session changes
  useEffect(() => {
    if (session?.user) {
      setFlagContext({
        userId: session.user.id,
        userSegment: 'beta', // Default to beta for now
        agencyId: session.user.id, // Using user ID as agency ID for now
      })
    } else {
      setFlagContext({})
    }
    setLoading(false)
  }, [session])

  const isEnabled = (flagKey: string): boolean => {
    return featureFlags.isEnabled(flagKey, flagContext)
  }

  const getEnabledFlags = (): string[] => {
    return featureFlags
      .getAllFlags()
      .filter(flag => featureFlags.isEnabled(flag.key, flagContext))
      .map(flag => flag.key)
  }

  const refreshFlags = async (): Promise<void> => {
    // In a real implementation, this would fetch updated flags from the server
    // For now, we'll just re-initialize the local flags
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
    setLoading(false)
  }

  const value: FeatureFlagContextValue = {
    isEnabled,
    getEnabledFlags,
    refreshFlags,
    loading,
  }

  return (
    <FeatureFlagReactContext.Provider value={value}>{children}</FeatureFlagReactContext.Provider>
  )
}

export function useFeatureFlags(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagReactContext)
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider')
  }
  return context
}

// Convenience hook for checking a single flag
export function useFeatureFlag(flagKey: string): boolean {
  const { isEnabled } = useFeatureFlags()
  return isEnabled(flagKey)
}
