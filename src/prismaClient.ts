// src/prismaClient.ts
import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const prisma = new PrismaClient();

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export default prisma;
