import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma client singleton
 * Prevents multiple instances in development due to hot reload
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log errors (remove "query" to speed up dev)
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
