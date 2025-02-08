-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BET_INVITE', 'BET_ENGAGED', 'BET_SETTLED', 'BET_VERIFIED', 'BET_DISPUTE', 'WITNESS_INVITE', 'WALLET_WITHDRAWAL', 'WALLET_FUNDING', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('FUND', 'PAYOUT', 'REFUND', 'COMMISSION', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('PENDING', 'LOCKED', 'RELEASED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SystemWalletType" AS ENUM ('SYSTEM');

-- CreateEnum
CREATE TYPE "SystemTransactionType" AS ENUM ('REVENUE');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('CREATOR', 'OPPONENT', 'DRAW', 'INVALID');

-- CreateEnum
CREATE TYPE "WitnessType" AS ENUM ('USER_DESIGNATED', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "WitnessStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "bet_invitation" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "creatorId" TEXT,
    "invitedUserId" TEXT,
    "invitedEmail" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bet_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bet_dispute" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "additionalEvidence" TEXT,

    CONSTRAINT "bet_dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "betId" TEXT,
    "walletTransactionId" TEXT,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "betId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "creatorStake" DOUBLE PRECISION NOT NULL,
    "opponentId" TEXT,
    "opponentStake" DOUBLE PRECISION,
    "status" "EscrowStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_wallet" (
    "id" TEXT NOT NULL,
    "type" "SystemWalletType" NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_wallet_transaction" (
    "id" TEXT NOT NULL,
    "systemWalletId" TEXT NOT NULL,
    "transactionType" "SystemTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_wallet_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "witness" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "vote" "VoteType",
    "type" "WitnessType" NOT NULL,
    "status" "WitnessStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "witness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bet_dispute_betId_key" ON "bet_dispute"("betId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_userId_key" ON "wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transaction_reference_key" ON "wallet_transaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_betId_key" ON "escrow"("betId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_account_userId_accountNumber_key" ON "bank_account"("userId", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "system_wallet_type_key" ON "system_wallet"("type");

-- CreateIndex
CREATE INDEX "witness_email_betId_userId_idx" ON "witness"("email", "betId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "witness_betId_userId_key" ON "witness"("betId", "userId");

-- AddForeignKey
ALTER TABLE "bet_invitation" ADD CONSTRAINT "bet_invitation_betId_fkey" FOREIGN KEY ("betId") REFERENCES "bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bet_invitation" ADD CONSTRAINT "bet_invitation_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bet_invitation" ADD CONSTRAINT "bet_invitation_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bet_dispute" ADD CONSTRAINT "bet_dispute_betId_fkey" FOREIGN KEY ("betId") REFERENCES "bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bet_dispute" ADD CONSTRAINT "bet_dispute_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_betId_fkey" FOREIGN KEY ("betId") REFERENCES "bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "wallet_transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_betId_fkey" FOREIGN KEY ("betId") REFERENCES "bet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow" ADD CONSTRAINT "escrow_betId_fkey" FOREIGN KEY ("betId") REFERENCES "bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow" ADD CONSTRAINT "escrow_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow" ADD CONSTRAINT "escrow_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_wallet_transaction" ADD CONSTRAINT "system_wallet_transaction_systemWalletId_fkey" FOREIGN KEY ("systemWalletId") REFERENCES "system_wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "witness" ADD CONSTRAINT "witness_betId_fkey" FOREIGN KEY ("betId") REFERENCES "bet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "witness" ADD CONSTRAINT "witness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
