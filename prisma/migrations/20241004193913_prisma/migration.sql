/*
  Warnings:

  - Added the required column `campaignName` to the `Campaign` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "campaignName" TEXT NOT NULL;
