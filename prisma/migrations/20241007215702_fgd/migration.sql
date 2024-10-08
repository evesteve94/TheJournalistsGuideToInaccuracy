/*
  Warnings:

  - You are about to drop the column `response` on the `generateText` table. All the data in the column will be lost.
  - Added the required column `content` to the `generateText` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `generateText` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "generateText" DROP COLUMN "response",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;
