/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "IntentionStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "intention" ADD COLUMN     "rescheduled_from_id" TEXT,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "email" TEXT,
ADD COLUMN     "is_guest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password_hash" TEXT;

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_revoked_at_idx" ON "refresh_token"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "intention_user_id_status_scheduled_at_idx" ON "intention"("user_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "intention_user_id_status_created_at_idx" ON "intention"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "intention_status_created_at_idx" ON "intention"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- AddForeignKey
ALTER TABLE "intention" ADD CONSTRAINT "intention_rescheduled_from_id_fkey" FOREIGN KEY ("rescheduled_from_id") REFERENCES "intention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
