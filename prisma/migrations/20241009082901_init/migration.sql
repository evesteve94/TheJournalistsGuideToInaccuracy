/*
  Warnings:

  - You are about to drop the `generateText` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Character" AS ENUM ('Marvin', 'Arthur', 'Zaphod');

-- CreateEnum
CREATE TYPE "Length" AS ENUM ('short', 'medium', 'long');

-- DropTable
DROP TABLE "generateText";

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "character" "Character" NOT NULL,
    "length" "Length" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);
