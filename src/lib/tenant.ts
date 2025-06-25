import { NextRequest } from 'next/server'
import type { User, Agency } from '@prisma/client' // Added
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { observability } from '@/lib/observability'

export interface TenantContext {
  agencyId: string
  agency: {
    id: string
    name: string
    slug: string
    plan: string
    status: string
    maxUsers: number
    maxConversations: number
  }
  user: {
    id: string
    email: string
    role: string
  }
}

/**
 * Middleware to extract and validate tenant context from request
 * Ensures proper multi-tenant isolation
 */
export async function getTenantContext(request?: NextRequest): Promise<TenantContext | null> {
  const startTime = Date.now()

  try {
    // Get user session
    const session = await auth()

    if (!session?.user?.id) {
      observability.trackEvent('tenant_context_no_session', {
        path: request?.nextUrl?.pathname || 'unknown',
        duration: Date.now() - startTime,
      })
      return null
    }

    // Get user with agency information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            status: true,
            maxUsers: true,
            maxConversations: true,
          },
        },
      },
    })

    if (!user || !user.agency) {
      observability.trackEvent('tenant_context_no_agency', {
        userId: session.user.id,
        path: request?.nextUrl?.pathname || 'unknown',
        duration: Date.now() - startTime,
      })
      return null
    }

    // Check if agency is active
    if (user.agency.status !== 'active') {
      observability.trackEvent('tenant_context_inactive_agency', {
        userId: session.user.id,
        agencyId: user.agency.id,
        agencyStatus: user.agency.status,
        path: request?.nextUrl?.pathname || 'unknown',
        duration: Date.now() - startTime,
      })
      return null
    }

    const tenantContext: TenantContext = {
      agencyId: user.agency.id,
      agency: user.agency,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }

    observability.trackEvent('tenant_context_resolved', {
      userId: user.id,
      agencyId: user.agency.id,
      agencyPlan: user.agency.plan,
      userRole: user.role,
      path: request?.nextUrl?.pathname || 'unknown',
      duration: Date.now() - startTime,
    })

    return tenantContext
  } catch (error) {
    observability.logger.error('tenant_context_error', error, {
      path: request?.nextUrl?.pathname || 'unknown',
      duration: Date.now() - startTime,
    })
    return null
  }
}

/**
 * Validate tenant access to specific resources
 */
export function validateTenantAccess(
  tenantContext: TenantContext,
  resourceAgencyId: string
): boolean {
  if (tenantContext.agencyId !== resourceAgencyId) {
    observability.trackEvent('tenant_access_violation', {
      userAgencyId: tenantContext.agencyId,
      resourceAgencyId,
      userId: tenantContext.user.id,
      userRole: tenantContext.user.role,
    })
    return false
  }
  return true
}

/**
 * Check if user has required role within their agency
 */
export function hasRole(tenantContext: TenantContext, requiredRole: string): boolean {
  const roleHierarchy = ['viewer', 'user', 'admin']
  const userRoleIndex = roleHierarchy.indexOf(tenantContext.user.role)
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)

  return userRoleIndex >= requiredRoleIndex
}

/**
 * Check usage limits for the agency
 */
export async function checkUsageLimits(
  tenantContext: TenantContext,
  limitType: 'users' | 'conversations'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  try {
    let current = 0
    let limit = 0

    switch (limitType) {
      case 'users':
        current = await prisma.user.count({
          where: { agencyId: tenantContext.agencyId },
        })
        limit = tenantContext.agency.maxUsers
        break

      case 'conversations':
        current = await prisma.conversation.count({
          where: { agencyId: tenantContext.agencyId },
        })
        limit = tenantContext.agency.maxConversations
        break
    }

    const allowed = current < limit

    if (!allowed) {
      observability.trackEvent('usage_limit_exceeded', {
        agencyId: tenantContext.agencyId,
        limitType,
        current,
        limit,
        plan: tenantContext.agency.plan,
      })
    }

    return { allowed, current, limit }
  } catch (error) {
    observability.logger.error('usage_limit_check_error', error, {
      agencyId: tenantContext.agencyId,
      limitType,
    })
    return { allowed: false, current: 0, limit: 0 }
  }
}

/**
 * Create tenant-scoped Prisma client
 * Automatically adds agency filter to all queries
 */
export function createTenantPrisma(agencyId: string) {
  return prisma.$extends({
    query: {
      conversation: {
        async findMany({ args, query }) {
          args.where = { ...args.where, agencyId }
          return query(args)
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, agencyId }
          return query(args)
        },
        async findUnique({ args, query }) {
          args.where = { ...args.where, agencyId }
          return query(args)
        },
        async create({ args, query }) {
 fix/prisma-types
          // Add agencyId to the data in a type-safe way
          args.data = { ...args.data, agencyId: agencyId };
          return query(args);
=======
          // Add agencyId to the data
          ;(args.data as any).agencyId = agencyId
          return query(args)
 main
        },
        async update({ args, query }) {
          args.where = { ...args.where, agencyId }
          return query(args)
        },
        async delete({ args, query }) {
          args.where = { ...args.where, agencyId }
          return query(args)
        },
      },
      message: {
        async findMany({ args, query }) {
          args.where = { ...args.where, agencyId }
          return query(args)
        },
        async create({ args, query }) {
 fix/prisma-types
          // Add agencyId to the data in a type-safe way
          args.data = { ...args.data, agencyId: agencyId };
          return query(args);
=======
          // Add agencyId to the data
          ;(args.data as any).agencyId = agencyId
          return query(args)
 main
        },
      },
      theme: {
        async findFirst({ args, query }) {
          args.where = { ...args.where, agencyId }
          return query(args)
        },
        async upsert({ args, query }) {
 fix/prisma-types
          args.where = { ...args.where, agencyId };
          // Add agencyId to create and update payloads in a type-safe way
          args.create = { ...args.create, agencyId: agencyId };
          args.update = { ...args.update, agencyId: agencyId }; // Assumes agencyId is a simple scalar field
          return query(args);
=======
          args.where = { ...args.where, agencyId }
          ;(args.create as any).agencyId = agencyId
          ;(args.update as any).agencyId = agencyId
          return query(args)
 main
        },
      },
    },
  })
}

/**
 * Initialize default agency for existing users during migration
 */
export async function initializeDefaultAgency(userId: string, userEmail: string): Promise<string> {
  try {
    // Check if user already has an agency
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { agency: true },
    })

    if (existingUser?.agency) {
      return existingUser.agency.id
    }

    // Create default agency for the user
    const agency = await prisma.agency.create({
      data: {
        name: `${userEmail.split('@')[0]}'s Agency`,
        slug: `agency-${userId.slice(-8)}`,
        plan: 'starter',
        status: 'active',
      },
    })

    // Update user with agency relationship
    await prisma.user.update({
      where: { id: userId },
      data: {
        agencyId: agency.id,
        role: 'admin', // First user becomes admin
      },
    })

    observability.trackEvent('default_agency_created', {
      userId,
      agencyId: agency.id,
      agencyName: agency.name,
    })

    return agency.id
  } catch (error) {
    observability.logger.error('default_agency_creation_error', error, {
      userId,
      userEmail,
    })
    throw error
  }
}
