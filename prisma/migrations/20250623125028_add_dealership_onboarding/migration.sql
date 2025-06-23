-- CreateTable
CREATE TABLE "dealership_onboardings" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "package" TEXT NOT NULL,
    "mainBrand" TEXT NOT NULL,
    "otherBrand" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactTitle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "siteAccessNotes" TEXT,
    "targetVehicleModels" TEXT[],
    "targetCities" TEXT[],
    "targetDealers" TEXT[],
    "submittedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "seoworksResponse" JSONB,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealership_onboardings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dealership_onboardings_agencyId_status_idx" ON "dealership_onboardings"("agencyId", "status");

-- CreateIndex
CREATE INDEX "dealership_onboardings_agencyId_createdAt_idx" ON "dealership_onboardings"("agencyId", "createdAt");

-- AddForeignKey
ALTER TABLE "dealership_onboardings" ADD CONSTRAINT "dealership_onboardings_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
