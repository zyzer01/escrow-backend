/*
  Warnings:

  - You are about to drop the column `betOpponentEmail` on the `bet` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "bet" DROP CONSTRAINT "bet_betOpponentEmail_fkey";

-- DropIndex
DROP INDEX "bet_betOpponentEmail_idx";

-- AlterTable
ALTER TABLE "bet" DROP COLUMN "betOpponentEmail",
ADD COLUMN     "opponentEmail" TEXT;

-- AlterTable
ALTER TABLE "witness" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'USER_DESIGNATED';

-- CreateIndex
CREATE INDEX "bet_opponentEmail_idx" ON "bet"("opponentEmail");

-- CreateIndex
CREATE INDEX "bet_creatorId_idx" ON "bet"("creatorId");

-- CreateIndex
CREATE INDEX "bet_opponentId_idx" ON "bet"("opponentId");

-- CreateIndex
CREATE INDEX "bet_winnerId_idx" ON "bet"("winnerId");

-- CreateIndex
CREATE INDEX "bet_invitation_betId_idx" ON "bet_invitation"("betId");

-- CreateIndex
CREATE INDEX "bet_invitation_creatorId_idx" ON "bet_invitation"("creatorId");

-- CreateIndex
CREATE INDEX "bet_invitation_invitedUserId_idx" ON "bet_invitation"("invitedUserId");
