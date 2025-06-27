-- AlterTable: Add actualHours and qualityScore to orders if they don't exist
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "actualHours" DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "qualityScore" INTEGER;

-- Add check constraint for qualityScore
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_qualityScore_check";
ALTER TABLE "orders" ADD CONSTRAINT "orders_qualityScore_check" CHECK ("qualityScore" IS NULL OR ("qualityScore" >= 1 AND "qualityScore" <= 5));

-- Add index for taskCategory for better query performance
CREATE INDEX IF NOT EXISTS "orders_taskCategory_idx" ON "orders"("taskCategory");