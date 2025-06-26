-- CreateTable
CREATE TABLE "user_ga4_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "expiryDate" TIMESTAMP(3),
    "scope" TEXT,
    "tokenType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ga4_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "cronPattern" TEXT NOT NULL,
    "ga4PropertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "emailRecipients" TEXT[],
    "brandingOptionsJson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_ga4_tokens_userId_key" ON "user_ga4_tokens"("userId");

-- CreateIndex
CREATE INDEX "report_schedules_agencyId_idx" ON "report_schedules"("agencyId");

-- CreateIndex
CREATE INDEX "report_schedules_userId_idx" ON "report_schedules"("userId");

-- CreateIndex
CREATE INDEX "report_schedules_isActive_nextRun_idx" ON "report_schedules"("isActive", "nextRun");

-- AddForeignKey
ALTER TABLE "user_ga4_tokens" ADD CONSTRAINT "user_ga4_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;