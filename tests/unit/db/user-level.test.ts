import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestPrismaClient } from "@/lib/prisma-test";

const prisma: PrismaClient = createTestPrismaClient();

async function seedUser(email = "ul-test@example.com") {
  return prisma.user.create({
    data: { email, passwordHash: "hash", displayName: "UL Tester" },
  });
}

// Level 1 is seeded static data (levelNumber = 1) — always available
const SEEDED_LEVEL = 1;

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

describe("UserLevel model", () => {
  it("creates a UserLevel with LOCKED status and 0 stars by default", async () => {
    const user = await seedUser();
    const ul = await prisma.userLevel.create({
      data: { userId: user.id, levelNumber: SEEDED_LEVEL },
    });

    expect(ul.status).toBe("LOCKED");
    expect(ul.stars).toBe(0);
    expect(ul.bestScore).toBe(0);
    expect(ul.completedAt).toBeNull();
  });

  it("throws P2002 on duplicate (userId, levelNumber) combination", async () => {
    const user = await seedUser();
    await prisma.userLevel.create({
      data: { userId: user.id, levelNumber: SEEDED_LEVEL },
    });

    await expect(
      prisma.userLevel.create({
        data: { userId: user.id, levelNumber: SEEDED_LEVEL },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("status transitions from LOCKED to UNLOCKED to COMPLETED", async () => {
    const user = await seedUser();
    const ul = await prisma.userLevel.create({
      data: { userId: user.id, levelNumber: SEEDED_LEVEL },
    });

    const unlocked = await prisma.userLevel.update({
      where: { id: ul.id },
      data: { status: "UNLOCKED" },
    });
    expect(unlocked.status).toBe("UNLOCKED");

    const completed = await prisma.userLevel.update({
      where: { id: ul.id },
      data: { status: "COMPLETED" },
    });
    expect(completed.status).toBe("COMPLETED");
  });

  it("sets stars to 3 and completedAt when marking COMPLETED", async () => {
    const user = await seedUser();
    const ul = await prisma.userLevel.create({
      data: { userId: user.id, levelNumber: SEEDED_LEVEL },
    });

    const completedAt = new Date();
    const updated = await prisma.userLevel.update({
      where: { id: ul.id },
      data: { status: "COMPLETED", stars: 3, completedAt },
    });

    expect(updated.stars).toBe(3);
    expect(updated.completedAt).toBeInstanceOf(Date);
  });

  it("stars > 3 is accepted by Prisma (no DB-level constraint — app must validate)", async () => {
    const user = await seedUser();
    const ul = await prisma.userLevel.create({
      data: { userId: user.id, levelNumber: SEEDED_LEVEL },
    });

    // No error expected — DB has no CHECK constraint on stars
    const updated = await prisma.userLevel.update({
      where: { id: ul.id },
      data: { stars: 5 },
    });
    expect(updated.stars).toBe(5);
  });

  it("findMany by userId returns all UserLevel rows for that user", async () => {
    const user = await seedUser("ul-many@example.com");
    // Only one seeded level for simplicity — use levels 1-5 (all seeded)
    for (const n of [1, 2, 3, 4, 5]) {
      await prisma.userLevel.create({
        data: { userId: user.id, levelNumber: n },
      });
    }

    const results = await prisma.userLevel.findMany({
      where: { userId: user.id },
    });
    expect(results).toHaveLength(5);
  });

  it("findMany by (userId, status) returns only the matching subset", async () => {
    const user = await seedUser("ul-status@example.com");

    const [ul1, ul2] = await Promise.all([
      prisma.userLevel.create({ data: { userId: user.id, levelNumber: 1 } }),
      prisma.userLevel.create({ data: { userId: user.id, levelNumber: 2, status: "UNLOCKED" } }),
      prisma.userLevel.create({ data: { userId: user.id, levelNumber: 3, status: "UNLOCKED" } }),
    ]);

    const locked = await prisma.userLevel.findMany({
      where: { userId: user.id, status: "LOCKED" },
    });
    expect(locked).toHaveLength(1);
    expect(locked[0].levelNumber).toBe(1);

    const unlocked = await prisma.userLevel.findMany({
      where: { userId: user.id, status: "UNLOCKED" },
    });
    expect(unlocked).toHaveLength(2);
  });

  it("deleting a user cascades to their UserLevel rows", async () => {
    const user = await seedUser();
    await prisma.userLevel.create({ data: { userId: user.id, levelNumber: SEEDED_LEVEL } });

    await prisma.user.delete({ where: { id: user.id } });

    const rows = await prisma.userLevel.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(0);
  });

  it("bestScore update is stored correctly", async () => {
    const user = await seedUser();
    const ul = await prisma.userLevel.create({
      data: { userId: user.id, levelNumber: SEEDED_LEVEL },
    });

    const updated = await prisma.userLevel.update({
      where: { id: ul.id },
      data: { bestScore: 9500 },
    });
    expect(updated.bestScore).toBe(9500);
  });
});
