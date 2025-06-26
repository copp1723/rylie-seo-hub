import { prisma } from './prisma'

export enum AuditAction {
  // GA4 OAuth Actions
  GA4_AUTH_INITIATED = 'GA4_AUTH_INITIATED',
  GA4_AUTH_CALLBACK_SUCCESS = 'GA4_AUTH_CALLBACK_SUCCESS',
  GA4_AUTH_CALLBACK_ERROR = 'GA4_AUTH_CALLBACK_ERROR',
  GA4_TOKEN_STORED = 'GA4_TOKEN_STORED',
  GA4_TOKEN_UPDATED = 'GA4_TOKEN_UPDATED',
  GA4_TOKEN_REFRESH = 'GA4_TOKEN_REFRESH',
  GA4_TOKEN_DELETED = 'GA4_TOKEN_DELETED',
  GA4_TOKEN_DECRYPTION_ERROR = 'GA4_TOKEN_DECRYPTION_ERROR',
  
  // GA4 Property Actions
  GA4_PROPERTY_LIST = 'GA4_PROPERTY_LIST',
  GA4_PROPERTY_LIST_FAILED = 'GA4_PROPERTY_LIST_FAILED',
  GA4_PROPERTY_ACCESS_VERIFIED = 'GA4_PROPERTY_ACCESS_VERIFIED',
  GA4_PROPERTY_ACCESS_DENIED = 'GA4_PROPERTY_ACCESS_DENIED',
  
  // GA4 Report Actions
  GA4_REPORT_GENERATED = 'GA4_REPORT_GENERATED',
  GA4_REPORT_FAILED = 'GA4_REPORT_FAILED',
  GA4_REPORT_RETRY = 'GA4_REPORT_RETRY',
  GA4_REPORT_SCHEDULE_PAUSED = 'GA4_REPORT_SCHEDULE_PAUSED',
  GA4_REPORT_SCHEDULE_RESUMED = 'GA4_REPORT_SCHEDULE_RESUMED',
}

interface AuditLogParams {
  action: AuditAction
  userId: string
  userEmail: string
  entityType: string
  entityId: string
  details?: Record<string, any>
}

/**
 * Create an audit log entry
 */
export async function createAuditLog({
  action,
  userId,
  userEmail,
  entityType,
  entityId,
  details,
}: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        userEmail,
        entityType,
        entityId,
        details: details || {},
      },
    })
  } catch (error) {
    // Don't throw on audit log errors to prevent breaking the main flow
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Helper function to log GA4 OAuth events
 */
export async function logGA4AuthEvent(
  action: AuditAction,
  userId: string,
  userEmail: string,
  details?: Record<string, any>
) {
  return createAuditLog({
    action,
    userId,
    userEmail,
    entityType: 'UserGA4Token',
    entityId: userId,
    details,
  })
}