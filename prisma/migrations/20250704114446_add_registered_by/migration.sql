/*
  Warnings:

  - Added the required column `registeredById` to the `Voter` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Voter" ADD COLUMN     "registeredById" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Voter" ADD CONSTRAINT "Voter_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
