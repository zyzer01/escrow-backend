/*
  Warnings:

  - The values [BET] on the enum `WalletTransactionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WalletTransactionType_new" AS ENUM ('FUND', 'PAYOUT', 'REFUND', 'STAKE', 'COMMISSION', 'WITHDRAWAL');
ALTER TABLE "wallet_transaction" ALTER COLUMN "type" TYPE "WalletTransactionType_new" USING ("type"::text::"WalletTransactionType_new");
ALTER TYPE "WalletTransactionType" RENAME TO "WalletTransactionType_old";
ALTER TYPE "WalletTransactionType_new" RENAME TO "WalletTransactionType";
DROP TYPE "WalletTransactionType_old";
COMMIT;
