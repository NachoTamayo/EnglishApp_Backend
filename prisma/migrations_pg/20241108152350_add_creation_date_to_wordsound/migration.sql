/*
  Warnings:

  - A unique constraint covering the columns `[original,translation]` on the table `Words` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UserWords" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Words_original_translation_key" ON "Words"("original", "translation");
