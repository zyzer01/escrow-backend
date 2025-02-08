-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'ACCEPTED', 'ACTIVE', 'VERIFIED', 'SETTLED', 'CANCELED', 'DISPUTED', 'REVERSED', 'REFUNDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BetType" AS ENUM ('WITH_WITNESSES', 'WITHOUT_WITNESSES');

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "creatorStake" DOUBLE PRECISION NOT NULL,
    "opponentStake" DOUBLE PRECISION,
    "totalStake" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "betType" "BetType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,
    "opponentId" TEXT,
    "betOpponentEmail" TEXT,
    "winnerId" TEXT,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Predictions" (
    "id" TEXT NOT NULL,
    "creatorPrediction" TEXT NOT NULL,
    "opponentPrediction" TEXT,
    "betId" TEXT NOT NULL,

    CONSTRAINT "Predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalBets" INTEGER NOT NULL DEFAULT 0,
    "totalWagered" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalWon" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bet_betOpponentEmail_idx" ON "Bet"("betOpponentEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Predictions_betId_key" ON "Predictions"("betId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_betOpponentEmail_fkey" FOREIGN KEY ("betOpponentEmail") REFERENCES "user"("email") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Predictions" ADD CONSTRAINT "Predictions_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
