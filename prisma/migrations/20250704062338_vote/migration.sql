/*
  Warnings:

  - Made the column `phoneNumber` on table `Voter` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Voter" ALTER COLUMN "phoneNumber" SET NOT NULL;
