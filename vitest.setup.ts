import { beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | undefined;

/**
 * Global setup — runs once per fork before any test in this file.
 *
 * DB migration + connect is BEST-EFFORT: if Neon is unreachable the engine /
 * store tests (no DB dependency) still run. Individual DB test files have
 * their own `prisma.$connect()` in beforeAll and will surface the error there.
 */
beforeAll(async () => {
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
