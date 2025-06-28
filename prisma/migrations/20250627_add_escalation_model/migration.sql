-- CreateTable
CREATE TABLE "escalations" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT,
    "chatContext" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "escalations_agencyId_status_idx" ON "escalations"("agencyId", "status");

-- CreateIndex
CREATE INDEX "escalations_userId_status_idx" ON "escalations"("userId", "status");

-- CreateIndex
CREATE INDEX "escalations_conversationId_idx" ON "escalations"("conversationId");

-- CreateIndex
CREATE INDEX "escalations_assignedTo_status_idx" ON "escalations"("assignedTo", "status");

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;