/**
 * Feature Flag System for Rylie SEO Hub
 * Enables safe rollouts and progressive feature deployment
 */

export interface FeatureFlag {
  key: string
  name: string
  description: string
  enabled: boolean
  rolloutPercentage: number
  userSegments: string[]
  dependencies?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface FeatureFlagContext {
  userId?: string
  userSegment?: string
  agencyId?: string
  plan?: string
}

/**
 * Feature Flag Service
 * Manages feature flag state and evaluation
 */
class FeatureFlagService {
  private flags = new Map<string, FeatureFlag>()

  constructor() {
    this.initializeDefaultFlags()
  }

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags() {
    const defaultFlags: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>[] = [
      {
        key: 'LOGO_UPLOAD',
        name: 'Logo Upload',
        description: 'Allow agencies to upload custom logos',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: ['admin', 'premium'],
      },
      {
        key: 'ADVANCED_ANALYTICS',
        name: 'Advanced Analytics',
        description: 'Enhanced analytics dashboard with detailed metrics',
        enabled: false,
        rolloutPercentage: 0,
        userSegments: ['premium', 'enterprise'],
      },
      {
        key: 'MULTI_MODEL_CHAT',
        name: 'Multi-Model Chat',
        description: 'Access to multiple AI models in chat',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: ['user', 'admin', 'premium'],
      },
      {
        key: 'WHITE_LABEL_THEMES',
        name: 'White Label Themes',
        description: 'Custom theming and branding options',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: ['admin', 'premium'],
      },
      {
        key: 'API_ACCESS',
        name: 'API Access',
        description: 'Access to REST API endpoints',
        enabled: false,
        rolloutPercentage: 0,
        userSegments: ['enterprise'],
      },
    ]

    defaultFlags.forEach(flag => {
      this.flags.set(flag.key, {
        ...flag,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })
  }

  /**
   * Check if a feature flag is enabled for the given context
   */
  isEnabled(flagKey: string, context: FeatureFlagContext = {}): boolean {
    const flag = this.flags.get(flagKey)

    if (!flag) {
      return false
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      return false
    }

    // Check dependencies
    if (flag.dependencies) {
      for (const dependency of flag.dependencies) {
        if (!this.isEnabled(dependency, context)) {
          return false
        }
      }
    }

    // Check user segment
    if (flag.userSegments.length > 0 && context.userSegment) {
      if (!flag.userSegments.includes(context.userSegment)) {
        return false
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100 && context.userId) {
      const userHash = this.hashUserId(context.userId)
      const userPercentile = userHash % 100
      if (userPercentile >= flag.rolloutPercentage) {
        return false
      }
    }

    return true
  }

  /**
   * Update a feature flag
   */
  updateFlag(flagKey: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(flagKey)
    if (!flag) {
      return false
    }

    const updatedFlag = {
      ...flag,
      ...updates,
      updatedAt: new Date(),
    }

    this.flags.set(flagKey, updatedFlag)
    return true
  }

  /**
   * Add a new feature flag
   */
  addFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): void {
    this.flags.set(flag.key, {
      ...flag,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * Remove a feature flag
   */
  removeFlag(flagKey: string): boolean {
    return this.flags.delete(flagKey)
  }

  /**
   * Get a specific flag
   */
  getFlag(flagKey: string): FeatureFlag | undefined {
    return this.flags.get(flagKey)
  }

  /**
   * Create a simple hash from user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Get all flags (for admin dashboard)
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values())
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagService()

/**
 * React hook for feature flags
 */
export function useFeatureFlag(flagKey: string, context: FeatureFlagContext = {}): boolean {
  return featureFlags.isEnabled(flagKey, context)
}

/**
 * Utility function for server-side feature flag checks
 */
export function checkFeatureFlag(flagKey: string, context: FeatureFlagContext = {}): boolean {
  return featureFlags.isEnabled(flagKey, context)
}
