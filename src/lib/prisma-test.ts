import { PrismaClient } from "@prisma/client";

// Creates a direct (non-Neon-adapter) PrismaClient for test environments.
// Tests connect via standard TCP to avoid WebSocket limitations.
export function createTestPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
    log: process.env.PRISMA_LOG ? ["query", "error"] : ["error"],
  });
}
