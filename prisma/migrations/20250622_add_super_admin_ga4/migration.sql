-- Add super admin flag to users
ALTER TABLE "users" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Add GA4 fields to agencies
ALTER TABLE "agencies" ADD COLUMN "ga4PropertyId" TEXT;
ALTER TABLE "agencies" ADD COLUMN "ga4PropertyName" TEXT;
ALTER TABLE "agencies" ADD COLUMN "ga4RefreshToken" TEXT;