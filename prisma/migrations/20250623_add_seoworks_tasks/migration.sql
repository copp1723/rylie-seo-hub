-- CreateTable
CREATE TABLE "seoworks_tasks" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completionDate" TIMESTAMP(3),
    "postTitle" TEXT NOT NULL,
    "postUrl" TEXT,
    "completionNotes" TEXT,
    "isWeekly" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "orderId" TEXT,
    "agencyId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "seoworks_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seoworks_tasks_externalId_key" ON "seoworks_tasks"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "seoworks_tasks_orderId_key" ON "seoworks_tasks"("orderId");

-- CreateIndex
CREATE INDEX "seoworks_tasks_externalId_idx" ON "seoworks_tasks"("externalId");

-- CreateIndex
CREATE INDEX "seoworks_tasks_agencyId_status_idx" ON "seoworks_tasks"("agencyId", "status");

-- CreateIndex
CREATE INDEX "seoworks_tasks_taskType_status_idx" ON "seoworks_tasks"("taskType", "status");

-- AddForeignKey
ALTER TABLE "seoworks_tasks" ADD CONSTRAINT "seoworks_tasks_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seoworks_tasks" ADD CONSTRAINT "seoworks_tasks_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;