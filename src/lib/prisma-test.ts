import { PrismaClient } from "@prisma/client";

// Creates a direct (non-Neon-adapter) PrismaClient for test environments.
// Tests connect via standard TCP to avoid WebSocket limitations.
//
// Throws if DATABASE_URL looks like a production database and
// TEST_DB_CONFIRMED=1 is not set — mirrors the check in vitest.setup.ts so
// tests that skip the global setup cannot bypass the guard.
export function createTestPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.test before running tests."
    );
  }

  if (process.env.TEST_DB_CONFIRMED !== "1") {
    const match = url.match(/\/([^/?#]+)(\?|#|$)/);
    const dbName = (match?.[1] ?? "").toLowerCase();
    const SAFE_PATTERNS = ["test", "shadow", "ci", "dev", "local", "staging"];

    if (!SAFE_PATTERNS.some((p) => dbName.includes(p))) {
      throw new Error(
        `createTestPrismaClient: DATABASE_URL points to "${dbName}" which does not look like a test database. ` +
          `Set TEST_DB_CONFIRMED=1 in .env.test to acknowledge this is an isolated test environment.`
      );
    }
  }

  return new PrismaClient({
    datasources: {
      db: { url },
    },
    log: process.env.PRISMA_LOG ? ["query", "error"] : ["error"],
  });
}
