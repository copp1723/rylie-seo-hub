import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { FeatureFlag, getFeatureFlag, updateFeatureFlag, getAllFeatureFlags } from '@/lib/feature-flags'
import { z } from 'zod'
import { observability } from '@/lib/observability'

const updateFlagSchema = z.object({
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  userSegments: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const session = await auth()

    if (!session?.user) {
      observability.logEvent('feature_flags_unauthorized_access', {
        ip: request.ip,
        userAgent: request.headers.get('user-agent'),
      })

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, allow all authenticated users to view flags
    // In production, you might want to restrict this to admin users
    const flags = featureFlags.getAllFlags()

    observability.logEvent('feature_flags_retrieved', {
      userId: session.user.id,
      flagCount: flags.length,
      duration: Date.now() - startTime,
    })

    return NextResponse.json({ flags })
  } catch (error) {
    observability.logError('feature_flags_get_error', error as Error, {
      userId: (await auth())?.user?.id,
      duration: Date.now() - startTime,
    })

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const startTime = Date.now()

  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, allow all authenticated users to update flags
    // In production, restrict this to admin users only
    const body = await request.json()
    const { flagKey, ...updates } = body

    if (!flagKey) {
      return NextResponse.json({ error: 'Flag key is required' }, { status: 400 })
    }

    // Validate updates
    const validatedUpdates = updateFlagSchema.parse(updates)

    const success = featureFlags.updateFlag(flagKey, validatedUpdates)

    if (!success) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 })
    }

    observability.logEvent('feature_flag_updated', {
      userId: session.user.id,
      flagKey,
      updates: validatedUpdates,
      duration: Date.now() - startTime,
    })

    return NextResponse.json({
      success: true,
      flag: featureFlags.getFlag(flagKey),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    observability.logError('feature_flags_update_error', error as Error, {
      userId: (await auth())?.user?.id,
      duration: Date.now() - startTime,
    })

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
