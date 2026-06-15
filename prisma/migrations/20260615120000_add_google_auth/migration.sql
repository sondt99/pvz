-- AlterTable: make passwordHash nullable (Google-only accounts have no password)
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable: add googleId column
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;

-- CreateIndex: unique constraint on googleId
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
