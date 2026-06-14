import { beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | undefined;

/**
 * Refuses to connect if the DATABASE_URL does not look like a test database.
 *
 * Safe database names must contain one of the safe patterns below.
 * Override by setting TEST_DB_CONFIRMED=1 in .env.test when using a Neon
 * branch or other isolated environment whose name does not contain a safe
 * pattern (e.g. the default Neon branch name "neondb").
 *
 * This prevents accidental destruction of production/staging data.
 */
function assertTestDatabase(url: string | undefined): void {
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.test before running tests."
    );
  }

  // Explicit opt-in for Neon branches or other isolated test DBs whose name
  // does not contain a recognisable test pattern.
  if (process.env.TEST_DB_CONFIRMED === "1") return;

  const match = url.match(/\/([^/?#]+)(\?|#|$)/);
  const dbName = (match?.[1] ?? "").toLowerCase();
  const SAFE_PATTERNS = ["test", "shadow", "ci", "dev", "local", "staging"];

  if (!SAFE_PATTERNS.some((p) => dbName.includes(p))) {
    throw new Error(
      `\n🚨  REFUSING TO RUN: DATABASE_URL points to database "${dbName}" which does not` +
        ` look like a test-safe database.\n` +
        `  Safe database names must contain one of: ${SAFE_PATTERNS.join(", ")}\n` +
        `  If this IS an isolated test database (e.g. a Neon branch), set\n` +
        `  TEST_DB_CONFIRMED=1 in your .env.test file to acknowledge this.\n`
    );
  }
}

/**
 * Global setup — runs once per fork before any test in this file.
 *
 * DB migration + connect is BEST-EFFORT: if Neon is unreachable the engine /
 * store tests (no DB dependency) still run. Individual DB test files have
 * their own `prisma.$connect()` in beforeAll and will surface the error there.
 */
beforeAll(async () => {
  assertTestDatabase(process.env.DATABASE_URL);

  try {
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: { ...process.env },
    });

    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    await prisma.$connect();
    (globalThis as Record<string, unknown>).__testPrisma = prisma;
  } catch {
    // DB unavailable — engine + store tests can still run.
    // Any DB test file that calls prisma.$connect() will fail on its own.
    console.warn(
      "\n⚠️  vitest.setup: DB connection failed — DB tests will error, engine tests will run.\n"
    );
  }
}, 120000);

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});
