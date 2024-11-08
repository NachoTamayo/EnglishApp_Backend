/*
  Warnings:

  - Added the required column `type` to the `Words` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Words" ADD COLUMN     "type" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "WordType" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "WordType_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Words" ADD CONSTRAINT "Words_type_fkey" FOREIGN KEY ("type") REFERENCES "WordType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
