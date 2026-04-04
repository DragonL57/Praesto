ALTER TABLE "User" ADD COLUMN "emailVerified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "verificationToken" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "verificationTokenExpiry" timestamp;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "resetPasswordToken" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "resetPasswordTokenExpiry" timestamp;