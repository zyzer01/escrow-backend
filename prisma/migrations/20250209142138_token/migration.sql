/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `bet_invitation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[token]` on the table `witness` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "bet_invitation" ADD COLUMN     "token" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "witness" ADD COLUMN     "token" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "bet_invitation_token_key" ON "bet_invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "witness_token_key" ON "witness"("token");
