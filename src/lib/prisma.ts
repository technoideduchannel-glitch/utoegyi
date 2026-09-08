import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "";

  if (url.startsWith("libsql:")) {
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    const { createClient } = require("@libsql/client");
    const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
    const adapter = new PrismaLibSql(client);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
