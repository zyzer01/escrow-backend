/*
  Warnings:

  - You are about to drop the column `link` on the `notification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "notification" DROP COLUMN "link",
ADD COLUMN     "params" JSONB;
