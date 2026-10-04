import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function withServerlessConnectionLimits(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") return databaseUrl;

    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }

    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "10");
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    const databaseUrl = process.env.DATABASE_URL;
    globalForPrisma.prisma = databaseUrl
      ? new PrismaClient({ datasources: { db: { url: withServerlessConnectionLimits(databaseUrl) } } })
      : new PrismaClient();
  }

  return globalForPrisma.prisma;
}
