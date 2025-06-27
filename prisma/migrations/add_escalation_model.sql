-- CreateTable: Escalation model for SEO team support requests
CREATE TABLE IF NOT EXISTS "escalations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "originalQuestion" TEXT NOT NULL,
    "aiResponse" TEXT,
    "userContext" TEXT,
    "conversationId" TEXT,
    "contactPreference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "tags" TEXT[],
    "responseTime" INTEGER,
    "resolutionTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "escalations_userId_status_idx" ON "escalations"("userId", "status");
CREATE INDEX IF NOT EXISTS "escalations_agencyId_status_idx" ON "escalations"("agencyId", "status");
CREATE INDEX IF NOT EXISTS "escalations_priority_status_idx" ON "escalations"("priority", "status");
CREATE INDEX IF NOT EXISTS "escalations_assignedTo_status_idx" ON "escalations"("assignedTo", "status");

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;