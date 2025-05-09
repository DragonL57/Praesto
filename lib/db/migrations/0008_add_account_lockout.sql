-- Add account lockout columns to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "accountLockedUntil" TIMESTAMP;