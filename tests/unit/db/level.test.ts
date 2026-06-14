import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient, Prisma } from "@prisma/client";
import { createTestPrismaClient } from "@/lib/prisma-test";

const prisma: PrismaClient = createTestPrismaClient();

// Use levelNumbers far above the 50 seeded ones to avoid PK conflicts
let nextLevelNumber = 9000;
function nextLevel() {
  return nextLevelNumber++;
}

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.gameSession.deleteMany();
  await prisma.userSeedPacket.deleteMany();
  await prisma.userLevel.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  // Clean test-created levels only (levelNumber >= 9000)
  await prisma.level.deleteMany({ where: { levelNumber: { gte: 9000 } } });
});

describe("Level model", () => {
  it("creates a DAY level and returns the levelNumber as PK", async () => {
    const n = nextLevel();
    const level = await prisma.level.create({
      data: {
        levelNumber: n,
        name: `Test Level ${n}`,
        worldNumber: 99,
        stageNumber: 1,
        environmentType: "DAY",
      },
    });

    expect(level.levelNumber).toBe(n);
    expect(level.environmentType).toBe("DAY");
    expect(level.briefingText).toBeNull();
  });

  it("creates a POOL level and environment enum round-trips correctly", async () => {
    const n = nextLevel();
    const level = await prisma.level.create({
      data: {
        levelNumber: n,
        name: `Pool Level ${n}`,
        worldNumber: 99,
        stageNumber: 2,
        environmentType: "POOL",
      },
    });

    expect(level.environmentType).toBe("POOL");
  });

  it("throws P2002 on duplicate levelNumber", async () => {
    const n = nextLevel();
    await prisma.level.create({
      data: {
        levelNumber: n,
        name: "First",
        worldNumber: 99,
        stageNumber: 3,
        environmentType: "DAY",
      },
    });

    await expect(
      prisma.level.create({
        data: {
          levelNumber: n,
          name: "Duplicate",
          worldNumber: 99,
          stageNumber: 4,
          environmentType: "NIGHT",
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("stores and retrieves unlockRequirement JSON with deep equality", async () => {
    const n = nextLevel();
    const req = { type: "completeWithStars", levelNumber: 1, stars: 2 };
    await prisma.level.create({
      data: {
        levelNumber: n,
        name: `JSON Level ${n}`,
        worldNumber: 99,
        stageNumber: 5,
        environmentType: "DAY",
        unlockRequirement: req,
      },
    });

    const found = await prisma.level.findUnique({
      where: { levelNumber: n },
    });

    expect(found?.unlockRequirement).toEqual(req);
  });

  it("unlockRequirement can be null", async () => {
    const n = nextLevel();
    await prisma.level.create({
      data: {
        levelNumber: n,
        name: `No Req ${n}`,
        worldNumber: 99,
        stageNumber: 6,
        environmentType: "DAY",
        unlockRequirement: Prisma.JsonNull,
      },
    });

    const found = await prisma.level.findUnique({
      where: { levelNumber: n },
    });
    expect(found?.unlockRequirement).toBeNull();
  });

  it("findMany by worldNumber returns levels for that world only", async () => {
    const n1 = nextLevel();
    const n2 = nextLevel();
    await prisma.level.createMany({
      data: [
        { levelNumber: n1, name: "W99 L1", worldNumber: 99, stageNumber: 1, environmentType: "DAY" },
        { levelNumber: n2, name: "W99 L2", worldNumber: 99, stageNumber: 2, environmentType: "NIGHT" },
      ],
    });

    const world99Levels = await prisma.level.findMany({
      where: { levelNumber: { gte: 9000 }, worldNumber: 99 },
    });

    expect(world99Levels.length).toBeGreaterThanOrEqual(2);
    expect(world99Levels.every((l) => l.worldNumber === 99)).toBe(true);
  });

  it("inserting an invalid environmentType at DB level raises an error", async () => {
    const n = nextLevel();
    // Prisma 6 uses camelCase column names — quote them explicitly in raw SQL
    await expect(
      prisma.$executeRaw`
        INSERT INTO levels ("levelNumber", name, "environmentType", "worldNumber", "stageNumber", "createdAt")
        VALUES (${n}, 'Bad Env', 'INVALID_ENV'::"EnvironmentType", 99, 7, NOW())
      `
    ).rejects.toThrow();
  });
});
