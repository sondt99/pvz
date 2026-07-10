import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestPrismaClient } from "@/lib/prisma-test";
import { hashSessionToken } from "@/lib/auth";
import { prisma as routePrisma } from "@/lib/prisma";
import { POST as completeSession } from "@/app/api/game/sessions/[id]/complete/route";

const prisma: PrismaClient = createTestPrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
  await routePrisma.$disconnect();
});

beforeEach(async () => {
  await prisma.gameSession.deleteMany();
  await prisma.userSeedPacket.deleteMany();
  await prisma.userLevel.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

async function seedUser(email: string) {
  return prisma.user.create({
    data: { email, passwordHash: "hash", displayName: email.split("@")[0] },
  });
}

async function createAuthToken(userId: string, token: string): Promise<string> {
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  return token;
}

function authHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}` };
}

function completeRequest(sessionId: string, body: unknown, token: string): Request {
  return new Request(`http://localhost/api/game/sessions/${sessionId}/complete`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  });
}

// Levelless (free-play) sessions fall back to DEFAULT_FINAL_WAVE_NUMBER (5).
const VALID_FREEPLAY_BODY = { score: 500, totalZombiesKilled: 10, waveNumber: 5, gameTimeMs: 120_000 };

describe("POST /api/game/sessions/:id/complete", () => {
  it("returns 403 when completing another user's session", async () => {
    const owner = await seedUser("complete-owner@example.com");
    const attacker = await seedUser("complete-attacker@example.com");
    const attackerToken = await createAuthToken(attacker.id, "attacker-complete-token");
    const session = await prisma.gameSession.create({
      data: { userId: owner.id, environmentType: "DAY", waterLaneIndices: [] },
    });

    const response = await completeSession(
      completeRequest(session.id, VALID_FREEPLAY_BODY, attackerToken),
      { params: Promise.resolve({ id: session.id }) }
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("rejects a malformed body with 400 instead of crashing", async () => {
    const user = await seedUser("complete-malformed@example.com");
    const token = await createAuthToken(user.id, "malformed-complete-token");
    const session = await prisma.gameSession.create({
      data: { userId: user.id, environmentType: "DAY", waterLaneIndices: [] },
    });

    const response = await completeSession(
      completeRequest(
        session.id,
        { score: "not-a-number", totalZombiesKilled: 1, waveNumber: 5, gameTimeMs: 1 },
        token
      ),
      { params: Promise.resolve({ id: session.id }) }
    );

    expect(response.status).toBe(400);
  });

  it("rejects completing a session immediately after creation (blocks instant-completion forgery)", async () => {
    const user = await seedUser("complete-instant@example.com");
    const token = await createAuthToken(user.id, "instant-complete-token");
    // startedAt defaults to now() — simulates create-then-immediately-complete.
    const session = await prisma.gameSession.create({
      data: { userId: user.id, environmentType: "DAY", waterLaneIndices: [] },
    });

    const response = await completeSession(
      completeRequest(
        session.id,
        { score: 999_999_999, totalZombiesKilled: 999, waveNumber: 999, gameTimeMs: 1 },
        token
      ),
      { params: Promise.resolve({ id: session.id }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Completion criteria/);

    const unchanged = await prisma.gameSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(unchanged.status).toBe("ACTIVE");
    expect(unchanged.score).toBe(0);

    const userLevels = await prisma.userLevel.findMany({ where: { userId: user.id } });
    expect(userLevels).toHaveLength(0);
  });

  it("rejects completion when the claimed waveNumber is below the level's actual final wave", async () => {
    const user = await seedUser("complete-lowwave@example.com");
    const token = await createAuthToken(user.id, "lowwave-complete-token");
    await prisma.level.upsert({
      where: { levelNumber: 9301 },
      update: { waveConfig: { finalWaveNumber: 10, waves: [] } },
      create: {
        levelNumber: 9301,
        name: "Test Low Wave Level",
        environmentType: "DAY",
        worldNumber: 93,
        stageNumber: 1,
        waveConfig: { finalWaveNumber: 10, waves: [] },
      },
    });
    const session = await prisma.gameSession.create({
      data: {
        userId: user.id,
        environmentType: "DAY",
        waterLaneIndices: [],
        levelNumber: 9301,
        startedAt: new Date(Date.now() - 60_000),
      },
    });

    const response = await completeSession(
      completeRequest(
        session.id,
        { score: 500, totalZombiesKilled: 10, waveNumber: 3, gameTimeMs: 120_000 },
        token
      ),
      { params: Promise.resolve({ id: session.id }) }
    );

    expect(response.status).toBe(400);

    const userLevels = await prisma.userLevel.findMany({ where: { userId: user.id } });
    expect(userLevels).toHaveLength(0);
  });

  it("accepts a legitimate completion, updates UserLevel, and unlocks the reward plant", async () => {
    const user = await seedUser("complete-legit@example.com");
    const token = await createAuthToken(user.id, "legit-complete-token");
    await prisma.seedPacket.upsert({
      where: { plantId: "test-reward-plant" },
      update: {},
      create: {
        plantId: "test-reward-plant",
        displayName: "Test Reward Plant",
        sunCost: 50,
        rechargeTime: 7,
      },
    });
    await prisma.level.upsert({
      where: { levelNumber: 9302 },
      update: { waveConfig: { finalWaveNumber: 2, waves: [] }, rewardPlantId: "test-reward-plant" },
      create: {
        levelNumber: 9302,
        name: "Test Legit Level",
        environmentType: "DAY",
        worldNumber: 93,
        stageNumber: 2,
        waveConfig: { finalWaveNumber: 2, waves: [] },
        rewardPlantId: "test-reward-plant",
      },
    });
    const session = await prisma.gameSession.create({
      data: {
        userId: user.id,
        environmentType: "DAY",
        waterLaneIndices: [],
        levelNumber: 9302,
        startedAt: new Date(Date.now() - 60_000),
      },
    });

    const response = await completeSession(
      completeRequest(
        session.id,
        { score: 500, totalZombiesKilled: 10, waveNumber: 2, gameTimeMs: 120_000 },
        token
      ),
      { params: Promise.resolve({ id: session.id }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.rewardUnlocked).toBe(true);

    const userLevel = await prisma.userLevel.findUniqueOrThrow({
      where: { userId_levelNumber: { userId: user.id, levelNumber: 9302 } },
    });
    expect(userLevel.status).toBe("COMPLETED");
    expect(userLevel.bestScore).toBe(500);

    const unlocked = await prisma.userSeedPacket.findUnique({
      where: { userId_plantId: { userId: user.id, plantId: "test-reward-plant" } },
    });
    expect(unlocked).not.toBeNull();
  });

  it("returns alreadyCompleted without reprocessing on a second call", async () => {
    const user = await seedUser("complete-double@example.com");
    const token = await createAuthToken(user.id, "double-complete-token");
    const session = await prisma.gameSession.create({
      data: {
        userId: user.id,
        environmentType: "DAY",
        waterLaneIndices: [],
        startedAt: new Date(Date.now() - 60_000),
        status: "COMPLETED",
      },
    });

    const response = await completeSession(
      completeRequest(session.id, VALID_FREEPLAY_BODY, token),
      { params: Promise.resolve({ id: session.id }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.alreadyCompleted).toBe(true);
  });
});
