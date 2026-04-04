-- Add updatedAt column to the Chat table
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP;

-- Set default value for existing rows to match createdAt
UPDATE "Chat" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Set the column to NOT NULL and add default value for new rows
ALTER TABLE "Chat" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Chat" ALTER COLUMN "updatedAt" SET DEFAULT NOW();