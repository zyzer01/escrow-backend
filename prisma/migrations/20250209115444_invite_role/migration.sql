-- CreateEnum
CREATE TYPE "BetInvitationRole" AS ENUM ('OPPONENT', 'WITNESS');

-- AlterTable
ALTER TABLE "bet_invitation" ADD COLUMN     "role" "BetInvitationRole" NOT NULL DEFAULT 'OPPONENT';
