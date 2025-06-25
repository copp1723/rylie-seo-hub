# Agency Data Isolation Implementation

## Overview

This document describes the implementation of multi-tenant data isolation for the Rylie SEO Hub platform. The system ensures that each agency's data is completely isolated from other agencies, preventing unauthorized access and data leaks.

## Architecture

### Core Components

1. **Agency Context Middleware** (`/src/lib/middleware/agency-context.ts`)
   - Extracts and validates agency context from authenticated requests
   - Enforces agency boundaries at the API level
   - Provides role-based access control within agencies

2. **Database Query Interceptor** (`/src/lib/db/tenant-filter.ts`)
   - Automatically filters all database queries by agencyId
   - Prevents cross-tenant data access at the database level
   - Logs access violations for security monitoring

3. **Enhanced Audit Service** (`/src/lib/services/audit-service.ts`)
   - Now includes agencyId in all audit logs
   - Tracks cross-tenant access attempts
   - Monitors suspicious activity patterns

## Key Features

### 1. Automatic Query Filtering

All database queries are automatically filtered by the current agency:

```typescript
// Instead of:
const orders = await prisma.order.findMany()

// Use:
const orders = await context.db.order.findMany()
// Automatically adds: WHERE agencyId = 'current-agency-id'
```

### 2. API Endpoint Protection

All API endpoints must use the `withAgencyContext` wrapper:

```typescript
export const GET = withAgencyContext(async (request, context) => {
  // context.db is pre-filtered for the agency
  // context.user contains user information
  // context.agency contains agency information
  
  const data = await context.db.order.findMany()
  return NextResponse.json({ data })
})
```

### 3. Cross-Tenant Security

The system prevents and logs cross-tenant access attempts:
- Queries for other agencies' data return null or empty results
- Update/delete operations on other agencies' data throw errors
- All violations are logged to the audit system

### 4. Super Admin Support

Super admins can access any agency's data by specifying the agency:
- Via header: `x-agency-id: <agency-id>`
- Via query parameter: `?agencyId=<agency-id>`

## Implementation Guide

### Converting Existing Endpoints

1. Replace direct prisma imports with agency context:

```typescript
// Before:
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const orders = await prisma.order.findMany()
  // ...
}

// After:
import { withAgencyContext } from '@/lib/middleware/agency-context'

export const GET = withAgencyContext(async (request, context) => {
  const orders = await context.db.order.findMany()
  // ...
})
```

2. Update error handling to include agency context:

```typescript
logger.error('Operation failed', {
  error,
  userId: context.user.id,
  agencyId: context.agency.id
})
```

3. Use agency context for audit logging:

```typescript
await context.db.auditLog.create({
  data: {
    action: 'RESOURCE_CREATED',
    entityType: 'order',
    entityId: order.id,
    userEmail: context.user.email,
    details: { /* ... */ }
  }
})
```

### Role-Based Access Control

Check user roles within the agency:

```typescript
import { requireRole } from '@/lib/middleware/agency-context'

export const POST = withAgencyContext(async (request, context) => {
  // Only admins can perform this action
  if (!requireRole(context, 'admin')) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }
  
  // Proceed with admin-only operation
})
```

### Usage Limits

Check agency plan limits:

```typescript
import { checkAgencyLimits } from '@/lib/middleware/agency-context'

export const POST = withAgencyContext(async (request, context) => {
  // Check if agency can create more conversations
  const limits = await checkAgencyLimits(context, 'conversations')
  
  if (!limits.allowed) {
    return NextResponse.json({
      error: 'Conversation limit exceeded',
      current: limits.current,
      limit: limits.limit
    }, { status: 429 })
  }
  
  // Create conversation
})
```

## Database Schema Updates

### AuditLog Model

The AuditLog model now includes agencyId:

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  
  // Multi-tenant isolation
  agencyId    String
  agency      Agency?  @relation(fields: [agencyId], references: [id])
  
  // ... rest of the model
}
```

### Migration Required

Run the following migration to add agencyId to existing audit logs:

```sql
-- Add agencyId column
ALTER TABLE audit_logs ADD COLUMN agencyId TEXT;

-- Create indexes
CREATE INDEX audit_logs_agencyId_idx ON audit_logs(agencyId);
CREATE INDEX audit_logs_agencyId_createdAt_idx ON audit_logs(agencyId, createdAt);

-- Update existing records (best effort)
UPDATE audit_logs 
SET agencyId = (
  SELECT agencyId FROM users WHERE users.email = audit_logs.userEmail LIMIT 1
)
WHERE agencyId IS NULL;

-- Set default for orphaned records
UPDATE audit_logs SET agencyId = 'legacy-unknown' WHERE agencyId IS NULL;
```

## Security Considerations

### 1. Always Use Context Database

Never use the raw prisma client in API endpoints:

```typescript
// ❌ WRONG - No agency filtering
const data = await prisma.order.findMany()

// ✅ CORRECT - Automatically filtered
const data = await context.db.order.findMany()
```

### 2. Validate Resource Ownership

For operations on specific resources, always validate ownership:

```typescript
import { validateResourceOwnership } from '@/lib/db/tenant-filter'

const isOwner = await validateResourceOwnership(
  'order',
  orderId,
  context.agency.id
)

if (!isOwner) {
  return NextResponse.json(
    { error: 'Resource not found' },
    { status: 404 }
  )
}
```

### 3. Monitor Access Violations

Regularly review audit logs for access violations:

```typescript
const violations = await context.db.auditLog.findMany({
  where: {
    action: 'TENANT_ACCESS_VIOLATION'
  },
  orderBy: { createdAt: 'desc' }
})
```

## Testing

Run the comprehensive test suite:

```bash
npm test src/lib/db/__tests__/agency-isolation.test.ts
```

The test suite covers:
- Tenant-filtered database operations
- Agency context extraction
- Cross-agency security
- Access violation logging
- API endpoint integration

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Access Violations**: Track TENANT_ACCESS_VIOLATION audit logs
2. **Failed Auth Attempts**: Monitor AUTH_FAILED events by agency
3. **Suspicious Patterns**: Watch for rapid access, mass exports, privilege escalations
4. **Inactive Agency Access**: Track attempts to access suspended agencies

### Recommended Alerts

1. Set up alerts for:
   - More than 5 access violations in 5 minutes
   - Any super admin access to non-admin endpoints
   - Failed authentication spikes
   - Attempts to access inactive agencies

## Rollout Plan

1. **Phase 1**: Deploy database schema changes
   - Run migration to add agencyId to audit_logs
   - Update Prisma schema

2. **Phase 2**: Deploy middleware
   - Deploy agency-context.ts and tenant-filter.ts
   - Update audit service

3. **Phase 3**: Convert API endpoints
   - Start with read-only endpoints
   - Move to write operations
   - Finally update admin endpoints

4. **Phase 4**: Monitoring
   - Enable access violation monitoring
   - Set up alerts
   - Review logs daily for first week

## Troubleshooting

### Common Issues

1. **"Agency ID is required" errors**
   - Ensure all API endpoints use withAgencyContext
   - Check that audit log calls include agencyId

2. **Empty results when data should exist**
   - Verify the user's agencyId matches the data
   - Check if agency is active
   - Review access violation logs

3. **Super admin access issues**
   - Ensure x-agency-id header is set
   - Verify the specified agency exists
   - Check super admin flag on user

### Debug Mode

Enable debug logging for tenant filtering:

```typescript
// In development, set NODE_ENV=development to see query filters
NODE_ENV=development npm run dev
```

This will log all filtered queries to help debug issues.

## Future Enhancements

1. **Row-Level Security**: Implement PostgreSQL RLS for additional security
2. **Agency Switching**: Allow users to belong to multiple agencies
3. **Delegated Access**: Temporary access grants between agencies
4. **Data Export**: Agency-specific data export capabilities
5. **Compliance**: SOC2 and GDPR compliance features