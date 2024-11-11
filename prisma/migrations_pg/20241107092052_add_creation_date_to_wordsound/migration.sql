-- CreateTable
CREATE TABLE "Words" (
    "id" SERIAL NOT NULL,
    "original" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "sound" BYTEA NOT NULL,
    "creationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWords" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "wordId" INTEGER NOT NULL,

    CONSTRAINT "UserWords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWords_userId_wordId_key" ON "UserWords"("userId", "wordId");

-- AddForeignKey
ALTER TABLE "UserWords" ADD CONSTRAINT "UserWords_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Words"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
