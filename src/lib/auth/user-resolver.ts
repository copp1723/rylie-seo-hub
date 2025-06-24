import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface ResolvedUser {
  id: string
  email: string
  name: string | null
  agencyId: string
  role: string
  isSuperAdmin: boolean
}

export interface TenantContext {
  userId: string
  agencyId: string
  agencyName: string
  agencySlug: string
  agencyPlan: string
  plan: string // Alias for agencyPlan
  limits: PlanLimits
}

export interface PlanLimits {
  conversations: number
  orders: number
  users: number
}

/**
 * Main resolver that handles all auth states
 * Works with AUTH_DISABLED=true (development) and AUTH_DISABLED=false (production)
 */
export async function getRequestUser(request?: NextRequest): Promise<ResolvedUser | null> {
  // Check if auth is disabled (development/testing)
  if (process.env.AUTH_DISABLED === 'true') {
    return getDefaultUser()
  }
  
  // Try to get authenticated user
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }
  
  // Fetch full user details from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { agency: true }
  })
  
  if (!user) return null
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    agencyId: user.agencyId || 'default-agency',
    role: user.role,
    isSuperAdmin: user.isSuperAdmin || false
  }
}

/**
 * Get tenant context for a user
 * Includes agency details and plan limits
 */
export async function getTenantContext(user: ResolvedUser): Promise<TenantContext> {
  const agency = await prisma.agency.findUnique({
    where: { id: user.agencyId }
  })
  
  if (!agency) {
    throw new Error(`Agency not found: ${user.agencyId}`)
  }
  
  return {
    userId: user.id,
    agencyId: agency.id,
    agencyName: agency.name,
    agencySlug: agency.slug,
    agencyPlan: agency.plan,
    plan: agency.plan, // Alias for compatibility
    limits: getPlanLimits(agency.plan)
  }
}

/**
 * Default user for development when AUTH_DISABLED=true
 */
function getDefaultUser(): ResolvedUser {
  return {
    id: process.env.DEFAULT_USER_ID || 'test-user-id',
    email: process.env.DEFAULT_USER_EMAIL || 'user@example.com',
    name: 'Test User',
    agencyId: process.env.DEFAULT_AGENCY_ID || 'default-agency',
    role: 'USER',
    isSuperAdmin: true
  }
}

/**
 * Get plan limits based on agency plan
 */
function getPlanLimits(plan: string): PlanLimits {
  const limits: Record<string, PlanLimits> = {
    free: { conversations: 10, orders: 5, users: 1 },
    starter: { conversations: 100, orders: 50, users: 5 },
    professional: { conversations: 1000, orders: 500, users: 20 },
    enterprise: { conversations: -1, orders: -1, users: -1 } // -1 means unlimited
  }
  
  return limits[plan.toLowerCase()] || limits.starter
}

/**
 * Check if a user has reached their plan limits
 */
export async function checkPlanLimits(
  user: ResolvedUser,
  resource: 'conversations' | 'orders' | 'users'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const tenantContext = await getTenantContext(user)
  const limit = tenantContext.limits[resource]
  
  // Unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 }
  }
  
  let current = 0
  
  switch (resource) {
    case 'conversations':
      current = await prisma.conversation.count({
        where: {
          agencyId: tenantContext.agencyId,
          deletedAt: null
        }
      })
      break
    case 'orders':
      // For orders, check monthly limit
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      current = await prisma.order.count({
        where: {
          agencyId: tenantContext.agencyId,
          createdAt: {
            gte: startOfMonth
          },
          deletedAt: null
        }
      })
      break
    case 'users':
      current = await prisma.user.count({
        where: {
          agencyId: tenantContext.agencyId
        }
      })
      break
  }
  
  return {
    allowed: current < limit,
    current,
    limit
  }
}