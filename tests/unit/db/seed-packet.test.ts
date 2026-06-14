import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestPrismaClient } from "@/lib/prisma-test";

const prisma: PrismaClient = createTestPrismaClient();

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
  // SeedPacket rows are static seeded data — do NOT delete
});

describe("SeedPacket model", () => {
  it("plantId is the primary key — findUnique works by plantId slug", async () => {
    const packet = await prisma.seedPacket.findUnique({
      where: { plantId: "peashooter" },
    });

    expect(packet).not.toBeNull();
    expect(packet?.plantId).toBe("peashooter");
    expect(packet?.displayName).toBe("Peashooter");
  });

  it("plantType enum is unique — two packets cannot share the same PlantType", async () => {
    // PEASHOOTER is already seeded — attempting to create another with the same plantType must fail
    await expect(
      prisma.seedPacket.create({
        data: {
          plantId: "peashooter-duplicate",
          displayName: "Duplicate Peashooter",
          plantType: "PEASHOOTER",
          sunCost: 100,
          rechargeTime: 7,
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("stats JSON stores an arbitrary shape and round-trips with deep equality", async () => {
    const packet = await prisma.seedPacket.findUnique({
      where: { plantId: "peashooter" },
    });

    expect(packet?.stats).toEqual({ damage: 20, range: "full-lane" });
  });

  it("findUnique by plantId returns the correct displayName", async () => {
    const packet = await prisma.seedPacket.findUnique({
      where: { plantId: "cherry-bomb" },
    });

    expect(packet?.displayName).toBe("Cherry Bomb");
    expect(packet?.sunCost).toBe(150);
  });

  it("findMany where isNightOnly=true returns only night-only plants", async () => {
    const nightOnly = await prisma.seedPacket.findMany({
      where: { isNightOnly: true },
    });

    expect(nightOnly.length).toBeGreaterThan(0);
    expect(nightOnly.every((p) => p.isNightOnly)).toBe(true);
    expect(nightOnly.some((p) => p.plantId === "puff-shroom")).toBe(true);
    expect(nightOnly.some((p) => p.plantId === "doom-shroom")).toBe(true);

    // Day plants should not appear
    expect(nightOnly.some((p) => p.plantId === "peashooter")).toBe(false);
  });

  it("findMany where isAquatic=true returns aquatic plants including lily-pad and sea-shroom", async () => {
    const aquatic = await prisma.seedPacket.findMany({
      where: { isAquatic: true },
    });

    expect(aquatic.length).toBeGreaterThan(0);
    expect(aquatic.every((p) => p.isAquatic)).toBe(true);
    expect(aquatic.some((p) => p.plantId === "lily-pad")).toBe(true);
    expect(aquatic.some((p) => p.plantId === "sea-shroom")).toBe(true);
  });

  it("rechargeTime stores integer seconds correctly", async () => {
    const packet = await prisma.seedPacket.findUnique({
      where: { plantId: "cherry-bomb" },
    });

    expect(packet?.rechargeTime).toBe(50);
    expect(typeof packet?.rechargeTime).toBe("number");
    expect(Number.isInteger(packet?.rechargeTime)).toBe(true);
  });
});
