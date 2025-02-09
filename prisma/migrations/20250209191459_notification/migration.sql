/*
  Warnings:

  - You are about to drop the column `betId` on the `notification` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "notification" DROP CONSTRAINT "notification_betId_fkey";

-- AlterTable
ALTER TABLE "notification" DROP COLUMN "betId";
