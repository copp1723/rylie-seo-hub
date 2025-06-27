-- Fix the user_invites table to use user ID instead of email for invitedBy

-- First, drop the existing foreign key constraint if it exists
ALTER TABLE "user_invites" DROP CONSTRAINT IF EXISTS "user_invites_invitedBy_fkey";

-- The invitedBy column should reference users.id not users.email
-- Since we're changing from email (string) to id (string), we need to clear existing data
-- or migrate it properly. For now, we'll assume no data exists yet.

-- Add the correct foreign key constraint
ALTER TABLE "user_invites" 
ADD CONSTRAINT "user_invites_invitedBy_fkey" 
FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;