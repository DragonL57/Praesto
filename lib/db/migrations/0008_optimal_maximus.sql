ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "accountLockedUntil" timestamp;