import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __attestlyPrisma: PrismaClient | undefined;
}

export const prisma = global.__attestlyPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__attestlyPrisma = prisma;
}
