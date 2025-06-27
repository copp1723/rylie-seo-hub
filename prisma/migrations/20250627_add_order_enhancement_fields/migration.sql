-- AlterTable: Add enhancement fields to orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'medium';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "keywords" JSONB;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "targetUrl" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "wordCount" INTEGER;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "seoworksTaskId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);

-- Create index for seoworksTaskId for faster lookups
CREATE INDEX IF NOT EXISTS "orders_seoworksTaskId_idx" ON "orders"("seoworksTaskId");

-- Create index for priority and status for task management queries
CREATE INDEX IF NOT EXISTS "orders_priority_status_idx" ON "orders"("priority", "status");