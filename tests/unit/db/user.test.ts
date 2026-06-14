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
});

describe("User model", () => {
  it("creates a user with required fields and generates a cuid PK", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        passwordHash: "hashed_password_123",
        displayName: "Test Player",
      },
    });

    expect(user.id).toBeTruthy();
    expect(user.id).toMatch(/^c[a-z0-9]+$/);
    expect(user.email).toBe("test@example.com");
    expect(user.displayName).toBe("Test Player");
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
    expect(user.avatarUrl).toBeNull();
  });

  it("throws P2002 on duplicate email", async () => {
    await prisma.user.create({
      data: {
        email: "dupe@example.com",
        passwordHash: "hash1",
        displayName: "Player 1",
      },
    });

    await expect(
      prisma.user.create({
        data: {
          email: "dupe@example.com",
          passwordHash: "hash2",
          displayName: "Player 2",
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("stores passwordHash exactly as provided without modification", async () => {
    const rawHash = "$2b$10$abcdefghijklmnopqrstuvwxyz012345678";
    const user = await prisma.user.create({
      data: {
        email: "hash@example.com",
        passwordHash: rawHash,
        displayName: "Hash Test",
      },
    });

    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.passwordHash).toBe(rawHash);
  });

  it("findUnique by email returns matching user", async () => {
    await prisma.user.create({
      data: {
        email: "find@example.com",
        passwordHash: "hash",
        displayName: "Find Test",
      },
    });

    const found = await prisma.user.findUnique({
      where: { email: "find@example.com" },
    });

    expect(found).not.toBeNull();
    expect(found?.email).toBe("find@example.com");
    expect(found?.displayName).toBe("Find Test");
  });

  it("findUnique by email returns null for non-existent email", async () => {
    const found = await prisma.user.findUnique({
      where: { email: "ghost@example.com" },
    });
    expect(found).toBeNull();
  });

  it("updating displayName bumps updatedAt timestamp", async () => {
    const user = await prisma.user.create({
      data: {
        email: "update@example.com",
        passwordHash: "hash",
        displayName: "Original Name",
      },
    });

    const originalUpdatedAt = user.updatedAt;
    await new Promise((resolve) => setTimeout(resolve, 20));

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { displayName: "New Name" },
    });

    expect(updated.displayName).toBe("New Name");
    expect(updated.updatedAt.getTime()).toBeGreaterThan(
      originalUpdatedAt.getTime()
    );
  });

  it("deleting a user cascades to all their sessions", async () => {
    const user = await prisma.user.create({
      data: {
        email: "cascade@example.com",
        passwordHash: "hash",
        displayName: "Cascade Test",
      },
    });

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: "token_hash_cascade_001",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });
    expect(sessions).toHaveLength(0);
  });

  it("email index exists in pg_indexes (index defined in schema)", async () => {
    // Seq Scan is correct for tiny tables — the query planner is right.
    // What matters is the index EXISTS so it fires at production row counts.
    const result = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'users'
        AND indexdef LIKE '%email%'
    `;
    expect(result.length).toBeGreaterThan(0);
  });
});
