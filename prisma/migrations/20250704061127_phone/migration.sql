/*
  Warnings:

  - A unique constraint covering the columns `[phoneNumber]` on the table `Voter` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Voter" ALTER COLUMN "phoneNumber" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Voter_phoneNumber_key" ON "Voter"("phoneNumber");
