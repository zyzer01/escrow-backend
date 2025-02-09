/*
  Warnings:

  - You are about to drop the column `role` on the `bet_invitation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "witness" DROP CONSTRAINT "witness_userId_fkey";

-- AlterTable
ALTER TABLE "bet_invitation" DROP COLUMN "role";

-- AlterTable
ALTER TABLE "witness" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "declinedAt" TIMESTAMP(3),
ADD COLUMN     "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "userId" DROP NOT NULL;

-- DropEnum
DROP TYPE "BetInvitationRole";

-- AddForeignKey
ALTER TABLE "witness" ADD CONSTRAINT "witness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
