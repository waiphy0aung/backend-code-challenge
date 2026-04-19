import { PrismaClient } from "./prisma/generated/client";

// Shared client — avoids spawning multiple connection pools.
export const prisma = new PrismaClient();

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
