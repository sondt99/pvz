import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestPrismaClient } from "@/lib/prisma-test";

const prisma: PrismaClient = createTestPrismaClient();

async function seedUser(email = "gs-test@example.com") {
  return prisma.user.create({
    data: { email, passwordHash: "hash", displayName: "GS Tester" },
  });
}

async function createDaySession(userId: string, overrides: Record<string, unknown> = {}) {
  return prisma.gameSession.create({
    data: {
      userId,
      environmentType: "DAY",
      waterLaneIndices: [],
      levelNumber: 1,
      ...overrides,
    },
  });
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
});

describe("GameSession model", () => {
  it("creates a DAY session with correct defaults", async () => {
    const user = await seedUser();
    const session = await createDaySession(user.id);

    expect(session.status).toBe("ACTIVE");
    expect(session.environmentType).toBe("DAY");
    expect(session.currentSun).toBe(50);
    expect(session.cumulativeSun).toBe(0);
    expect(session.waveNumber).toBe(0);
    expect(session.score).toBe(0);
    expect(session.gravesEnabled).toBe(false);
    expect(session.fogEnabled).toBe(false);
    expect(session.slopeEnabled).toBe(false);
    expect(session.gridRows).toBe(5);
    expect(session.gridCols).toBe(9);
    expect(session.waterLaneIndices).toEqual([]);
    expect(session.gridState).toEqual([]);
    expect(session.zombieState).toEqual([]);
    expect(session.seedCooldowns).toEqual({});
    expect(session.loadoutSnapshot).toEqual([]);
    expect(session.finalFlagSpawned).toBe(false);
  });

  it("POOL session stores waterLaneIndices=[2,3] and round-trips correctly", async () => {
    const user = await seedUser();
    const session = await prisma.gameSession.create({
      data: {
        userId: user.id,
        environmentType: "POOL",
        waterLaneIndices: [2, 3],
        levelNumber: 21,
      },
    });

    const found = await prisma.gameSession.findUnique({
      where: { id: session.id },
    });
    expect(found?.waterLaneIndices).toEqual([2, 3]);
  });

  it("loadoutSnapshot stores plant slugs in insertion order", async () => {
    const user = await seedUser();
    const snapshot = ["sunflower", "peashooter", "cherry-bomb", "wall-nut"];
    const session = await prisma.gameSession.create({
      data: {
        userId: user.id,
        environmentType: "DAY",
        waterLaneIndices: [],
        loadoutSnapshot: snapshot,
      },
    });

    const found = await prisma.gameSession.findUnique({
      where: { id: session.id },
    });
    expect(found?.loadoutSnapshot).toEqual(snapshot);
  });

  it("pausing a session updates status to PAUSED and bumps lastSavedAt", async () => {
    const user = await seedUser();
    const session = await createDaySession(user.id);
    const original = session.lastSavedAt;

    await new Promise((resolve) => setTimeout(resolve, 20));

    const updated = await prisma.gameSession.update({
      where: { id: session.id },
      data: { status: "PAUSED", lastSavedAt: new Date() },
    });

    expect(updated.status).toBe("PAUSED");
    expect(updated.lastSavedAt.getTime()).toBeGreaterThan(original.getTime());
  });

  it("completing a session sets endedAt and status=COMPLETED", async () => {
    const user = await seedUser();
    const session = await createDaySession(user.id);

    const updated = await prisma.gameSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED", endedAt: new Date() },
    });

    expect(updated.status).toBe("COMPLETED");
    expect(updated.endedAt).toBeInstanceOf(Date);
  });

  it("currentSun can be updated to 0", async () => {
    const user = await seedUser();
    const session = await createDaySession(user.id);

    const updated = await prisma.gameSession.update({
      where: { id: session.id },
      data: { currentSun: 0 },
    });

    expect(updated.currentSun).toBe(0);
  });

  it("waveNumber increments correctly across multiple updates", async () => {
    const user = await seedUser();
    const session = await createDaySession(user.id);

    for (let wave = 1; wave <= 3; wave++) {
      await prisma.gameSession.update({
        where: { id: session.id },
        data: { waveNumber: wave },
      });
    }

    const found = await prisma.gameSession.findUnique({
      where: { id: session.id },
    });
    expect(found?.waveNumber).toBe(3);
  });

  it("findMany ACTIVE sessions for a userId returns only active sessions", async () => {
    const user = await seedUser();
    await createDaySession(user.id);
    await createDaySession(user.id);
    await prisma.gameSession.create({
      data: {
        userId: user.id,
        environmentType: "DAY",
        waterLaneIndices: [],
        status: "COMPLETED",
        endedAt: new Date(),
      },
    });

    const active = await prisma.gameSession.findMany({
      where: { userId: user.id, status: "ACTIVE" },
    });
    expect(active).toHaveLength(2);
  });

  it("(userId, status) index sanity: PAUSED filter excludes ACTIVE sessions", async () => {
    const user = await seedUser();
    await createDaySession(user.id);
    await prisma.gameSession.create({
      data: {
        userId: user.id,
        environmentType: "NIGHT",
        waterLaneIndices: [],
        gravesEnabled: true,
        status: "PAUSED",
      },
    });

    const paused = await prisma.gameSession.findMany({
      where: { userId: user.id, status: "PAUSED" },
    });
    expect(paused).toHaveLength(1);
    expect(paused[0].environmentType).toBe("NIGHT");
  });

  it("deleting a user cascades to all their game sessions", async () => {
    const user = await seedUser();
    await createDaySession(user.id);
    await createDaySession(user.id);

    await prisma.user.delete({ where: { id: user.id } });

    const sessions = await prisma.gameSession.findMany({
      where: { userId: user.id },
    });
    expect(sessions).toHaveLength(0);
  });

  it("levelNumber can be null for endless/challenge mode sessions", async () => {
    const user = await seedUser();
    const session = await prisma.gameSession.create({
      data: {
        userId: user.id,
        environmentType: "DAY",
        waterLaneIndices: [],
        levelNumber: null,
      },
    });

    expect(session.levelNumber).toBeNull();

    const found = await prisma.gameSession.findUnique({
      where: { id: session.id },
      include: { level: true },
    });
    expect(found?.level).toBeNull();
  });

  it("FOG session has fogEnabled=true", async () => {
    const user = await seedUser();
    const session = await prisma.gameSession.create({
      data: {
        userId: user.id,
        environmentType: "FOG",
        waterLaneIndices: [2, 3],
        fogEnabled: true,
        levelNumber: 31,
      },
    });

    expect(session.environmentType).toBe("FOG");
    expect(session.fogEnabled).toBe(true);
  });

  it("ROOF session has slopeEnabled=true", async () => {
    const user = await seedUser();
    const session = await prisma.gameSession.create({
      data: {
        userId: user.id,
        environmentType: "ROOF",
        waterLaneIndices: [],
        slopeEnabled: true,
        levelNumber: 41,
      },
    });

    expect(session.environmentType).toBe("ROOF");
    expect(session.slopeEnabled).toBe(true);
  });

  it("seedCooldowns JSON stores and retrieves per-plant remaining cooldown map", async () => {
    const user = await seedUser();
    const session = await createDaySession(user.id);

    const cooldowns = { "cherry-bomb": 45000, "peashooter": 0, "sunflower": 7000 };
    await prisma.gameSession.update({
      where: { id: session.id },
      data: { seedCooldowns: cooldowns },
    });

    const found = await prisma.gameSession.findUnique({
      where: { id: session.id },
    });
    expect(found?.seedCooldowns).toEqual(cooldowns);
  });
});
