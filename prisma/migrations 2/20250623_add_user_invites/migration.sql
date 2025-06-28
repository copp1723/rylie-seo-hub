-- CreateTable
CREATE TABLE "user_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "agencyId" TEXT,
    "invitedBy" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_invites_token_key" ON "user_invites"("token");

-- CreateIndex
CREATE INDEX "user_invites_email_status_idx" ON "user_invites"("email", "status");

-- CreateIndex
CREATE INDEX "user_invites_token_idx" ON "user_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_invites_email_agencyId_key" ON "user_invites"("email", "agencyId");

-- AddForeignKey
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("email") ON DELETE RESTRICT ON UPDATE CASCADE;