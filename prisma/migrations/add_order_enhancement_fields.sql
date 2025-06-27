-- AlterTable: Add enhancement fields to orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pageTitle" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "contentUrl" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "taskCategory" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "packageType" TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "orders_taskCategory_idx" ON "orders"("taskCategory");
CREATE INDEX IF NOT EXISTS "orders_packageType_idx" ON "orders"("packageType");