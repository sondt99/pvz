import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestPrismaClient } from "@/lib/prisma-test";

const prisma: PrismaClient = createTestPrismaClient();

async function seedUser(email = "usp-test@example.com") {
  return prisma.user.create({
    data: { email, passwordHash: "hash", displayName: "USP Tester" },
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

describe("UserSeedPacket model", () => {
  it("creates an unlock row with unlockedAt timestamp set", async () => {
    const user = await seedUser();
    const usp = await prisma.userSeedPacket.create({
      data: { userId: user.id, plantId: "peashooter" },
    });

    expect(usp.userId).toBe(user.id);
    expect(usp.plantId).toBe("peashooter");
    expect(usp.unlockedAt).toBeInstanceOf(Date);
    expect(usp.isInLoadout).toBe(false);
    expect(usp.loadoutSlot).toBeNull();
  });

  it("throws P2002 on duplicate (userId, plantId) combination", async () => {
    const user = await seedUser();
    await prisma.userSeedPacket.create({
      data: { userId: user.id, plantId: "peashooter" },
    });

    await expect(
      prisma.userSeedPacket.create({
        data: { userId: user.id, plantId: "peashooter" },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("sets isInLoadout=true and assigns a loadoutSlot", async () => {
    const user = await seedUser();
    const usp = await prisma.userSeedPacket.create({
      data: { userId: user.id, plantId: "sunflower" },
    });

    const updated = await prisma.userSeedPacket.update({
      where: { id: usp.id },
      data: { isInLoadout: true, loadoutSlot: 1 },
    });

    expect(updated.isInLoadout).toBe(true);
    expect(updated.loadoutSlot).toBe(1);
  });

  it("findMany where isInLoadout=true returns exactly the plants in the loadout with correct slots", async () => {
    const user = await seedUser();
    const plants = ["sunflower", "peashooter", "cherry-bomb"];

    for (let i = 0; i < plants.length; i++) {
      const usp = await prisma.userSeedPacket.create({
        data: { userId: user.id, plantId: plants[i] },
      });
      await prisma.userSeedPacket.update({
        where: { id: usp.id },
        data: { isInLoadout: true, loadoutSlot: i + 1 },
      });
    }
    // One extra not in loadout
    await prisma.userSeedPacket.create({
      data: { userId: user.id, plantId: "wall-nut" },
    });

    const inLoadout = await prisma.userSeedPacket.findMany({
      where: { userId: user.id, isInLoadout: true },
      orderBy: { loadoutSlot: "asc" },
    });

    expect(inLoadout).toHaveLength(3);
    expect(inLoadout[0].plantId).toBe("sunflower");
    expect(inLoadout[0].loadoutSlot).toBe(1);
    expect(inLoadout[2].loadoutSlot).toBe(3);
  });

  it("loadoutSlot is null and isInLoadout is false by default", async () => {
    const user = await seedUser();
    const usp = await prisma.userSeedPacket.create({
      data: { userId: user.id, plantId: "wall-nut" },
    });

    expect(usp.isInLoadout).toBe(false);
    expect(usp.loadoutSlot).toBeNull();
  });

  it("findMany by userId returns all unlocked packets for that user", async () => {
    const user = await seedUser();
    const plants = ["sunflower", "peashooter", "cherry-bomb", "wall-nut", "snow-pea"];

    for (const plantId of plants) {
      await prisma.userSeedPacket.create({
        data: { userId: user.id, plantId },
      });
    }

    const all = await prisma.userSeedPacket.findMany({
      where: { userId: user.id },
    });
    expect(all).toHaveLength(5);
  });

  it("deleting a user cascades to their UserSeedPacket rows", async () => {
    const user = await seedUser();
    await prisma.userSeedPacket.create({
      data: { userId: user.id, plantId: "peashooter" },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const rows = await prisma.userSeedPacket.findMany({
      where: { userId: user.id },
    });
    expect(rows).toHaveLength(0);
  });

  it("creating a UserSeedPacket with a non-existent plantId fails with a FK violation", async () => {
    // Verifies that the FK constraint (UserSeedPacket.plantId → SeedPacket.plantId) is enforced at DB level.
    // All 38 PlantTypes are seeded, so we cannot create a temp SeedPacket with a unique PlantType;
    // instead we validate the FK from the other direction.
    const user = await seedUser();

    await expect(
      prisma.userSeedPacket.create({
        data: { userId: user.id, plantId: "this-plant-does-not-exist" },
      })
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("findMany with include seedPacket exposes nested sunCost", async () => {
    const user = await seedUser();
    await prisma.userSeedPacket.create({
      data: { userId: user.id, plantId: "melon-pult" },
    });

    const result = await prisma.userSeedPacket.findMany({
      where: { userId: user.id },
      include: { seedPacket: true },
    });

    expect(result).toHaveLength(1);
    expect(result[0].seedPacket.sunCost).toBe(300);
    expect(result[0].seedPacket.displayName).toBe("Melon-pult");
  });
});
