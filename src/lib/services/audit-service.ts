import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/observability'

export interface AuditEvent {
  action: string
  resourceType: string
  resourceId: string
  userId: string
  agencyId: string
  metadata?: Record<string, any>
  userEmail?: string
  ipAddress?: string
  userAgent?: string
}

export interface AuditLogFilter {
  agencyId?: string
  userId?: string
  resourceType?: string
  action?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface SuspiciousPattern {
  type: 'rapid_access' | 'unusual_hour' | 'mass_export' | 'failed_auth' | 'privilege_escalation'
  threshold: number
  timeWindow: number // in minutes
}

const SUSPICIOUS_PATTERNS: SuspiciousPattern[] = [
  { type: 'rapid_access', threshold: 100, timeWindow: 5 },
  { type: 'mass_export', threshold: 50, timeWindow: 10 },
  { type: 'failed_auth', threshold: 5, timeWindow: 5 },
  { type: 'privilege_escalation', threshold: 3, timeWindow: 60 }
]

const SENSITIVE_ACTIONS = [
  'USER_ROLE_CHANGED',
  'USER_DELETED',
  'DATA_EXPORTED',
  'SETTINGS_CHANGED',
  'API_KEY_CREATED',
  'API_KEY_DELETED'
]

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    // Validate required fields
    if (!event.agencyId) {
      logger.error('Audit event missing required agencyId', { event })
      return // Don't throw to avoid breaking the application
    }

    // Create the audit log entry
    const auditLog = await prisma.auditLog.create({
      data: {
        agencyId: event.agencyId,
        action: event.action,
        entityType: event.resourceType,
        entityId: event.resourceId,
        userEmail: event.userEmail || '',
        details: {
          ...event.metadata,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          timestamp: new Date().toISOString()
        }
      }
    })

    // Check for suspicious patterns
    if (SENSITIVE_ACTIONS.includes(event.action)) {
      await checkSuspiciousActivity(event)
    }

    logger.info('Audit event logged', {
      auditLogId: auditLog.id,
      action: event.action,
      resourceType: event.resourceType,
      userId: event.userId
    })
  } catch (error) {
    logger.error('Failed to log audit event', {
      error,
      event
    })
    // Don't throw - audit logging should not break the application
  }
}

export async function getAuditLogs(filter: AuditLogFilter) {
  const where: any = {}

  // CRITICAL: Always filter by agencyId for multi-tenant isolation
  if (filter.agencyId) {
    where.agencyId = filter.agencyId
  } else {
    logger.error('getAuditLogs called without agencyId filter', { filter })
    throw new Error('Agency ID is required for audit log queries')
  }

  if (filter.userId) {
    where.userEmail = await getUserEmailById(filter.userId)
  }

  if (filter.resourceType) {
    where.entityType = filter.resourceType
  }

  if (filter.action) {
    where.action = filter.action
  }

  if (filter.startDate || filter.endDate) {
    where.createdAt = {}
    if (filter.startDate) {
      where.createdAt.gte = filter.startDate
    }
    if (filter.endDate) {
      where.createdAt.lte = filter.endDate
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filter.limit || 100,
    skip: filter.offset || 0,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  })

  const total = await prisma.auditLog.count({ where })

  return {
    logs: logs.map(log => ({
      id: log.id,
      action: log.action,
      resourceType: log.entityType,
      resourceId: log.entityId,
      user: log.user,
      details: log.details as Record<string, any>,
      createdAt: log.createdAt
    })),
    total,
    limit: filter.limit || 100,
    offset: filter.offset || 0
  }
}

async function checkSuspiciousActivity(event: AuditEvent) {
  for (const pattern of SUSPICIOUS_PATTERNS) {
    const timeWindowStart = new Date(Date.now() - pattern.timeWindow * 60 * 1000)
    
    let count = 0
    
    switch (pattern.type) {
      case 'rapid_access':
        count = await prisma.auditLog.count({
          where: {
            agencyId: event.agencyId,
            userEmail: event.userEmail,
            createdAt: { gte: timeWindowStart }
          }
        })
        break
        
      case 'mass_export':
        count = await prisma.auditLog.count({
          where: {
            agencyId: event.agencyId,
            userEmail: event.userEmail,
            action: { contains: 'EXPORT' },
            createdAt: { gte: timeWindowStart }
          }
        })
        break
        
      case 'failed_auth':
        count = await prisma.auditLog.count({
          where: {
            agencyId: event.agencyId,
            userEmail: event.userEmail,
            action: 'AUTH_FAILED',
            createdAt: { gte: timeWindowStart }
          }
        })
        break
        
      case 'privilege_escalation':
        count = await prisma.auditLog.count({
          where: {
            agencyId: event.agencyId,
            userEmail: event.userEmail,
            action: { in: ['USER_ROLE_CHANGED', 'PERMISSION_GRANTED'] },
            createdAt: { gte: timeWindowStart }
          }
        })
        break
    }
    
    if (count >= pattern.threshold) {
      logger.warn('Suspicious activity detected', {
        pattern: pattern.type,
        userId: event.userId,
        count,
        threshold: pattern.threshold,
        timeWindow: pattern.timeWindow
      })
      
      // Log the suspicious activity itself
      await prisma.auditLog.create({
        data: {
          agencyId: event.agencyId,
          action: 'SUSPICIOUS_ACTIVITY_DETECTED',
          entityType: 'security',
          entityId: event.userId,
          userEmail: event.userEmail || '',
          details: {
            patternType: pattern.type,
            count,
            threshold: pattern.threshold,
            triggeringAction: event.action,
            triggeringResource: `${event.resourceType}:${event.resourceId}`
          }
        }
      })
    }
  }
}

export async function cleanupOldAuditLogs() {
  const retentionDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days
  
  try {
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: retentionDate }
      }
    })
    
    logger.info('Cleaned up old audit logs', {
      deletedCount: result.count,
      retentionDate
    })
    
    return result.count
  } catch (error) {
    logger.error('Failed to cleanup old audit logs', { error })
    throw error
  }
}

async function getUserEmailById(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  })
  return user?.email || ''
}

export function formatAuditAction(action: string): string {
  const actionMap: Record<string, string> = {
    'ORDER_CREATED': 'Created order',
    'ORDER_UPDATED': 'Updated order',
    'ORDER_DELETED': 'Deleted order',
    'USER_LOGIN': 'User logged in',
    'USER_LOGOUT': 'User logged out',
    'USER_CREATED': 'User created',
    'USER_UPDATED': 'User updated',
    'USER_DELETED': 'User deleted',
    'USER_ROLE_CHANGED': 'User role changed',
    'CONVERSATION_CREATED': 'Created conversation',
    'CONVERSATION_DELETED': 'Deleted conversation',
    'MESSAGE_CREATED': 'Created message',
    'DATA_EXPORTED': 'Exported data',
    'SETTINGS_CHANGED': 'Changed settings',
    'API_KEY_CREATED': 'Created API key',
    'API_KEY_DELETED': 'Deleted API key',
    'AUTH_FAILED': 'Authentication failed',
    'SUSPICIOUS_ACTIVITY_DETECTED': 'Suspicious activity detected'
  }
  
  return actionMap[action] || action
}

export function getResourceTypeIcon(resourceType: string): string {
  const iconMap: Record<string, string> = {
    'order': '📦',
    'user': '👤',
    'conversation': '💬',
    'message': '✉️',
    'settings': '⚙️',
    'security': '🔒',
    'api': '🔑'
  }
  
  return iconMap[resourceType] || '📄'
}