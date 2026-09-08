import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const tursoUrl = process.env.DATABASE_URL ?? "";
  const authToken = process.env.DATABASE_AUTH_TOKEN ?? "";

  if (tursoUrl.startsWith("libsql:") && authToken) {
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken,
    } as never);
    return new PrismaClient({ adapter } as never);
  }

  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
