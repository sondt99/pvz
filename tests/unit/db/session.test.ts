import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestPrismaClient } from "@/lib/prisma-test";

const prisma: PrismaClient = createTestPrismaClient();

async function seedUser(email = "session-user@example.com") {
  return prisma.user.create({
    data: { email, passwordHash: "hash", displayName: "Session Tester" },
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

describe("Session model", () => {
  it("creates a session linked to a user with correct defaults", async () => {
    const user = await seedUser();
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: "secure_hash_abc123",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    expect(session.userId).toBe(user.id);
    expect(session.tokenHash).toBe("secure_hash_abc123");
    expect(session.revokedAt).toBeNull();
    expect(session.createdAt).toBeInstanceOf(Date);
  });

  it("throws P2002 on duplicate tokenHash", async () => {
    const user = await seedUser();
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: "duplicate_token_hash",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    await expect(
      prisma.session.create({
        data: {
          userId: user.id,
          tokenHash: "duplicate_token_hash",
          expiresAt: new Date(Date.now() + 86400000),
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("findUnique by tokenHash returns the matching session", async () => {
    const user = await seedUser();
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: "find_me_token",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const found = await prisma.session.findUnique({
      where: { tokenHash: "find_me_token" },
    });

    expect(found).not.toBeNull();
    expect(found?.userId).toBe(user.id);
    expect(found?.revokedAt).toBeNull();
  });

  it("setting revokedAt marks the session as revoked", async () => {
    const user = await seedUser();
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: "revoke_me_token",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const updated = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(updated?.revokedAt).toBeInstanceOf(Date);
  });

  it("can query sessions where expiresAt is in the past", async () => {
    const user = await seedUser();
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: "expired_token_xyz",
        expiresAt: new Date(Date.now() - 5000),
      },
    });

    const expired = await prisma.session.findMany({
      where: { expiresAt: { lt: new Date() } },
    });

    expect(expired.some((s) => s.tokenHash === "expired_token_xyz")).toBe(true);
  });

  it("deleting a user cascades to all their sessions", async () => {
    const user = await seedUser();
    for (let i = 0; i < 3; i++) {
      await prisma.session.create({
        data: {
          userId: user.id,
          tokenHash: `cascade_token_${i}`,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
    }

    await prisma.user.delete({ where: { id: user.id } });

    const remaining = await prisma.session.findMany({
      where: { userId: user.id },
    });
    expect(remaining).toHaveLength(0);
  });

  it("findMany by userId returns all sessions for that user", async () => {
    const user = await seedUser();
    for (let i = 0; i < 3; i++) {
      await prisma.session.create({
        data: {
          userId: user.id,
          tokenHash: `multi_token_${i}`,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
    }

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });
    expect(sessions).toHaveLength(3);
  });
});
