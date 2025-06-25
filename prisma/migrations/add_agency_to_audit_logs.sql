-- Add agencyId to AuditLog table for proper multi-tenant isolation
-- This is a critical security update

-- Add the agencyId column (nullable initially)
ALTER TABLE audit_logs ADD COLUMN agencyId TEXT;

-- Create an index for better query performance
CREATE INDEX audit_logs_agencyId_idx ON audit_logs(agencyId);

-- Create a compound index for agency-scoped queries
CREATE INDEX audit_logs_agencyId_createdAt_idx ON audit_logs(agencyId, createdAt);

-- Update existing audit logs to have agencyId based on user's current agency
-- This is a best-effort migration - some logs might not get updated if users have changed agencies
UPDATE audit_logs 
SET agencyId = (
  SELECT agencyId 
  FROM users 
  WHERE users.email = audit_logs.userEmail
  LIMIT 1
)
WHERE agencyId IS NULL;

-- For audit logs where we couldn't determine the agency, set a default
-- This ensures data integrity going forward
UPDATE audit_logs 
SET agencyId = 'legacy-unknown'
WHERE agencyId IS NULL;

-- Note: In a production environment, you would want to:
-- 1. Make agencyId NOT NULL after migration
-- 2. Add a foreign key constraint to the agencies table
-- 3. Consider what to do with orphaned audit logs