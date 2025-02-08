/*
  Warnings:

  - The values [WITH_WITNESSES,WITHOUT_WITNESSES] on the enum `BetType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `banExpires` on the `user` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BetType_new" AS ENUM ('WITH-WITNESSES', 'WITHOUT-WITNESSES');
ALTER TABLE "bet" ALTER COLUMN "betType" TYPE "BetType_new" USING ("betType"::text::"BetType_new");
ALTER TYPE "BetType" RENAME TO "BetType_old";
ALTER TYPE "BetType_new" RENAME TO "BetType";
DROP TYPE "BetType_old";
COMMIT;

-- AlterTable
ALTER TABLE "profile" ALTER COLUMN "createdAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "banExpires" SET DATA TYPE INTEGER,
ALTER COLUMN "createdAt" DROP DEFAULT;
