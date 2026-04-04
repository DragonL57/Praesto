ALTER TABLE "User" ALTER COLUMN "password" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "sessionVersion" integer DEFAULT 1 NOT NULL;
