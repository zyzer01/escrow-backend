-- DropIndex
DROP INDEX "witness_email_betId_userId_idx";

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE INDEX "witness_email_idx" ON "witness"("email");

-- CreateIndex
CREATE INDEX "witness_betId_idx" ON "witness"("betId");

-- CreateIndex
CREATE INDEX "witness_userId_idx" ON "witness"("userId");
