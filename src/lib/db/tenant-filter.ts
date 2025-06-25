import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/observability'

// Models that require tenant isolation
const TENANT_ISOLATED_MODELS = [
  'conversation',
  'message', 
  'order',
  'theme',
  'usageMetric',
  'featureFlagOverride',
  'dealershipOnboarding',
  'seoWorksTask',
  'userInvite',
  'orderMessage'
] as const

type TenantIsolatedModel = typeof TENANT_ISOLATED_MODELS[number]

// Models that don't require agencyId but need filtering
const USER_SCOPED_MODELS = ['user', 'auditLog'] as const
type UserScopedModel = typeof USER_SCOPED_MODELS[number]

interface TenantContext {
  agencyId: string
  userId: string
}

/**
 * Creates a Prisma client with automatic tenant filtering
 * This ensures all queries are automatically scoped to the correct agency
 */
export function createTenantFilteredPrisma(context: TenantContext) {
  return prisma.$extends({
    query: {
      // Apply tenant filtering to all isolated models
      ...TENANT_ISOLATED_MODELS.reduce((acc, model) => {
        acc[model] = {
          async findMany({ args, query }) {
            args.where = { ...args.where, agencyId: context.agencyId }
            logQuery('findMany', model, args.where)
            return query(args)
          },
          async findFirst({ args, query }) {
            args.where = { ...args.where, agencyId: context.agencyId }
            logQuery('findFirst', model, args.where)
            return query(args)
          },
          async findUnique({ args, query }) {
            // For findUnique, we need to add agencyId to the where clause differently
            const result = await query(args)
            if (result && (result as any).agencyId !== context.agencyId) {
              logAccessViolation('findUnique', model, (result as any).id, context)
              return null
            }
            return result
          },
          async findUniqueOrThrow({ args, query }) {
            const result = await query(args)
            if (result && (result as any).agencyId !== context.agencyId) {
              logAccessViolation('findUniqueOrThrow', model, (result as any).id, context)
              throw new Error('Access denied: Resource not found')
            }
            return result
          },
          async create({ args, query }) {
            // Ensure agencyId is set on creation
            args.data = { ...args.data, agencyId: context.agencyId }
            logQuery('create', model, args.data)
            return query(args)
          },
          async createMany({ args, query }) {
            // Ensure agencyId is set on all records
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item) => ({ ...item, agencyId: context.agencyId }))
            } else {
              args.data = { ...args.data, agencyId: context.agencyId }
            }
            logQuery('createMany', model, args.data)
            return query(args)
          },
          async update({ args, query }) {
            // Verify the record belongs to the agency before updating
            const existing = await prisma[model].findUnique({ where: args.where })
            if (existing && (existing as any).agencyId !== context.agencyId) {
              logAccessViolation('update', model, (existing as any).id, context)
              throw new Error('Access denied: Cannot update resource from another agency')
            }
            return query(args)
          },
          async updateMany({ args, query }) {
            args.where = { ...args.where, agencyId: context.agencyId }
            logQuery('updateMany', model, args.where)
            return query(args)
          },
          async delete({ args, query }) {
            // Verify the record belongs to the agency before deleting
            const existing = await prisma[model].findUnique({ where: args.where })
            if (existing && (existing as any).agencyId !== context.agencyId) {
              logAccessViolation('delete', model, (existing as any).id, context)
              throw new Error('Access denied: Cannot delete resource from another agency')
            }
            return query(args)
          },
          async deleteMany({ args, query }) {
            args.where = { ...args.where, agencyId: context.agencyId }
            logQuery('deleteMany', model, args.where)
            return query(args)
          },
          async count({ args, query }) {
            args.where = { ...args.where, agencyId: context.agencyId }
            return query(args)
          },
          async aggregate({ args, query }) {
            args.where = { ...args.where, agencyId: context.agencyId }
            return query(args)
          },
          async groupBy({ args, query }) {
            args.where = { ...args.where, agencyId: context.agencyId }
            return query(args)
          }
        }
        return acc
      }, {} as Record<TenantIsolatedModel, any>),

      // Special handling for User model (filter by agencyId in where clause)
      user: {
        async findMany({ args, query }) {
          args.where = { ...args.where, agencyId: context.agencyId }
          logQuery('findMany', 'user', args.where)
          return query(args)
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, agencyId: context.agencyId }
          logQuery('findFirst', 'user', args.where)
          return query(args)
        },
        async count({ args, query }) {
          args.where = { ...args.where, agencyId: context.agencyId }
          return query(args)
        }
      },

      // Special handling for AuditLog (no direct agencyId, but filter through user relation)
      auditLog: {
        async findMany({ args, query }) {
          // Include user relation to filter by agency
          args.include = { ...args.include, user: true }
          const results = await query(args)
          // Filter results to only include logs from users in the same agency
          return results.filter((log: any) => 
            log.user?.agencyId === context.agencyId
          )
        },
        async create({ args, query }) {
          // Add agencyId to the details for tracking
          args.data.details = {
            ...((args.data.details as object) || {}),
            agencyId: context.agencyId
          }
          return query(args)
        }
      }
    },
  })
}

/**
 * Log query for debugging and monitoring
 */
function logQuery(operation: string, model: string, filter: any) {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Tenant-filtered query', {
      operation,
      model,
      filter
    })
  }
}

/**
 * Log access violations for security monitoring
 */
function logAccessViolation(
  operation: string,
  model: string,
  resourceId: string,
  context: TenantContext
) {
  logger.warn('Tenant access violation attempted', {
    operation,
    model,
    resourceId,
    attemptedByUserId: context.userId,
    attemptedByAgencyId: context.agencyId
  })

  // Create audit log for the violation
  prisma.auditLog.create({
    data: {
      action: 'TENANT_ACCESS_VIOLATION',
      entityType: model,
      entityId: resourceId,
      userEmail: context.userId, // This should be userEmail, but we have userId
      details: {
        operation,
        attemptedAgencyId: context.agencyId,
        timestamp: new Date().toISOString()
      }
    }
  }).catch((error) => {
    logger.error('Failed to log access violation to audit log', { error })
  })
}

/**
 * Validate that a resource belongs to the specified agency
 * Use this for additional validation when needed
 */
export async function validateResourceOwnership(
  model: TenantIsolatedModel,
  resourceId: string,
  agencyId: string
): Promise<boolean> {
  try {
    const resource = await (prisma[model] as any).findUnique({
      where: { id: resourceId },
      select: { agencyId: true }
    })
    
    return resource?.agencyId === agencyId
  } catch (error) {
    logger.error('Error validating resource ownership', {
      model,
      resourceId,
      agencyId,
      error
    })
    return false
  }
}

/**
 * Create a transaction with tenant filtering
 * Ensures all operations within the transaction respect tenant boundaries
 */
export async function createTenantTransaction<T>(
  context: TenantContext,
  callback: (tx: ReturnType<typeof createTenantFilteredPrisma>) => Promise<T>
): Promise<T> {
  const tenantPrisma = createTenantFilteredPrisma(context)
  
  return prisma.$transaction(async (tx) => {
    // Create a tenant-filtered version of the transaction client
    const filteredTx = Object.create(tx)
    
    // Apply the same filtering logic to the transaction
    TENANT_ISOLATED_MODELS.forEach((model) => {
      const originalModel = tx[model]
      filteredTx[model] = new Proxy(originalModel, {
        get(target, prop) {
          if (typeof target[prop] === 'function') {
            return tenantPrisma[model][prop].bind(tenantPrisma[model])
          }
          return target[prop]
        }
      })
    })
    
    return callback(filteredTx as any)
  })
}