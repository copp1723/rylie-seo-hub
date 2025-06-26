-- Add Report Execution History table for tracking report runs and failures
CREATE TABLE IF NOT EXISTS "report_execution_history" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scheduleId" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, retrying
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "error" TEXT,
  "errorCode" TEXT, -- OAUTH_EXPIRED, API_RATE_LIMIT, GENERATION_FAILED, etc.
  "reportUrl" TEXT,
  "emailsSent" BOOLEAN NOT NULL DEFAULT false,
  "retryAfter" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "report_execution_history_scheduleId_fkey" 
    FOREIGN KEY ("scheduleId") REFERENCES "report_schedules"("id") ON DELETE CASCADE,
  CONSTRAINT "report_execution_history_agencyId_fkey" 
    FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE
);

-- Add indexes for efficient querying
CREATE INDEX "report_execution_history_scheduleId_idx" ON "report_execution_history"("scheduleId");
CREATE INDEX "report_execution_history_agencyId_idx" ON "report_execution_history"("agencyId");
CREATE INDEX "report_execution_history_status_idx" ON "report_execution_history"("status");
CREATE INDEX "report_execution_history_failedAt_idx" ON "report_execution_history"("failedAt");
CREATE INDEX "report_execution_history_retryAfter_idx" ON "report_execution_history"("retryAfter");

-- Add columns to report_schedules for tracking failures
ALTER TABLE "report_schedules" 
ADD COLUMN IF NOT EXISTS "lastExecutionId" TEXT,
ADD COLUMN IF NOT EXISTS "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastFailureAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastSuccessAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "isPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "pausedReason" TEXT;

-- Add foreign key for lastExecutionId
ALTER TABLE "report_schedules" 
ADD CONSTRAINT "report_schedules_lastExecutionId_fkey" 
  FOREIGN KEY ("lastExecutionId") REFERENCES "report_execution_history"("id") 
  ON DELETE SET NULL;