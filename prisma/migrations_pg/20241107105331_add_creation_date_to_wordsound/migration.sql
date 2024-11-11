/*
  Warnings:

  - You are about to drop the column `sound` on the `Words` table. All the data in the column will be lost.
  - Changed the type of `original` on the `Words` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Words" DROP COLUMN "sound",
DROP COLUMN "original",
ADD COLUMN     "original" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "EnglishWords" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "sound" BYTEA NOT NULL,

    CONSTRAINT "EnglishWords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnglishWords_word_key" ON "EnglishWords"("word");

-- AddForeignKey
ALTER TABLE "Words" ADD CONSTRAINT "Words_original_fkey" FOREIGN KEY ("original") REFERENCES "EnglishWords"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
