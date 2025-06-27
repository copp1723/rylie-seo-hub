-- CreateTable
CREATE TABLE "user_search_console_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "expiryDate" TIMESTAMP(3),
    "scope" TEXT,
    "verifiedSites" TEXT[],
    "primarySite" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_search_console_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_search_console_tokens_userId_key" ON "user_search_console_tokens"("userId");

-- AddForeignKey
ALTER TABLE "user_search_console_tokens" ADD CONSTRAINT "user_search_console_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;