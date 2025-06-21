-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1e40af',
    "logo" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "status" TEXT NOT NULL DEFAULT 'active',
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxConversations" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_metrics" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "model" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL DEFAULT 'daily',

    CONSTRAINT "usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_overrides" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

-- Add agencyId to existing tables
ALTER TABLE "users" ADD COLUMN "agencyId" TEXT;
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';

ALTER TABLE "conversations" ADD COLUMN "agencyId" TEXT;
ALTER TABLE "messages" ADD COLUMN "agencyId" TEXT;
ALTER TABLE "themes" ADD COLUMN "agencyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "agencies_slug_key" ON "agencies"("slug");
CREATE UNIQUE INDEX "agencies_domain_key" ON "agencies"("domain");
CREATE INDEX "usage_metrics_agencyId_date_idx" ON "usage_metrics"("agencyId", "date");
CREATE INDEX "usage_metrics_agencyId_metricType_date_idx" ON "usage_metrics"("agencyId", "metricType", "date");
CREATE UNIQUE INDEX "feature_flag_overrides_agencyId_flagKey_key" ON "feature_flag_overrides"("agencyId", "flagKey");
CREATE INDEX "conversations_agencyId_userId_idx" ON "conversations"("agencyId", "userId");
CREATE INDEX "conversations_agencyId_updatedAt_idx" ON "conversations"("agencyId", "updatedAt");
CREATE INDEX "messages_agencyId_conversationId_idx" ON "messages"("agencyId", "conversationId");
CREATE INDEX "messages_agencyId_createdAt_idx" ON "messages"("agencyId", "createdAt");
CREATE UNIQUE INDEX "themes_agencyId_key" ON "themes"("agencyId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "themes" ADD CONSTRAINT "themes_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_metrics" ADD CONSTRAINT "usage_metrics_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

