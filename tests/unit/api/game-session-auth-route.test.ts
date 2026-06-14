import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestPrismaClient } from "@/lib/prisma-test";
import { hashSessionToken } from "@/lib/auth";
import { prisma as routePrisma } from "@/lib/prisma";
import {
  GET as listGameSessions,
  POST as createGameSession,
} from "@/app/api/game/sessions/route";
import { GET as loadGameSession } from "@/app/api/game/sessions/[id]/route";
import { POST as saveGameSession } from "@/app/api/game/sessions/[id]/save/route";
import type { SerializedGameState } from "@/lib/game-serializer";

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
    data: {
      email,
      passwordHash: "hash",
      displayName: email.split("@")[0],
    },
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

async function createDayGameSession(userId: string) {
  return prisma.gameSession.create({
    data: {
      userId,
      environmentType: "DAY",
      waterLaneIndices: [],
      levelNumber: 1,
    },
  });
}

function createSavePayload(): SerializedGameState {
  return {
    gameTimeMs: 1_000,
    environmentState: {
      gridCells: [],
      nextSkyDropTimerMs: 0,
    },
    graveState: [],
    gridState: [],
    zombieState: [],
    projectileState: [],
    sunDropState: [],
    lawnMowerState: [],
    spawnQueueState: [],
    seedCooldowns: {},
    loadoutSnapshot: ["PEASHOOTER"],
    currentSun: 999,
    cumulativeSun: 999,
    score: 999,
    waveNumber: 3,
    nextWaveTimerMs: 5000,
    totalZombiesKilled: 8,
  };
}

describe("game session API authentication and ownership", () => {
  it("returns 401 when listing sessions without an authenticated session token", async () => {
    const response = await listGameSessions(
      new Request("http://localhost/api/game/sessions")
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication required");
  });

  it("creates sessions for the authenticated user and ignores spoofed userId in the body", async () => {
    const owner = await seedUser("session-owner@example.com");
    const attacker = await seedUser("session-attacker@example.com");
    const token = await createAuthToken(owner.id, "owner-create-token");

    const response = await createGameSession(
      new Request("http://localhost/api/game/sessions", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          userId: attacker.id,
          environmentType: "DAY",
          loadout: ["PEASHOOTER", "SUNFLOWER"],
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);

    const session = await prisma.gameSession.findUniqueOrThrow({
      where: { id: body.sessionId },
    });
    expect(session.userId).toBe(owner.id);
  });

  it("lists only sessions owned by the authenticated user", async () => {
    const owner = await seedUser("list-owner@example.com");
    const other = await seedUser("list-other@example.com");
    const token = await createAuthToken(owner.id, "owner-list-token");
    const ownSession = await createDayGameSession(owner.id);
    await createDayGameSession(other.id);

    const response = await listGameSessions(
      new Request(`http://localhost/api/game/sessions?userId=${other.id}`, {
        headers: authHeaders(token),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(ownSession.id);
    expect(body[0].environmentType).toBe("DAY");
  });

  it("returns 403 when loading another user's game session", async () => {
    const owner = await seedUser("load-owner@example.com");
    const attacker = await seedUser("load-attacker@example.com");
    const attackerToken = await createAuthToken(attacker.id, "attacker-load-token");
    const ownerSession = await createDayGameSession(owner.id);

    const response = await loadGameSession(
      new Request(`http://localhost/api/game/sessions/${ownerSession.id}`, {
        headers: authHeaders(attackerToken),
      }),
      {
        params: Promise.resolve({ id: ownerSession.id }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 and does not mutate state when saving another user's game session", async () => {
    const owner = await seedUser("save-owner@example.com");
    const attacker = await seedUser("save-attacker@example.com");
    const attackerToken = await createAuthToken(attacker.id, "attacker-save-token");
    const ownerSession = await createDayGameSession(owner.id);

    const response = await saveGameSession(
      new Request(`http://localhost/api/game/sessions/${ownerSession.id}/save`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders(attackerToken),
        },
        body: JSON.stringify(createSavePayload()),
      }),
      {
        params: Promise.resolve({ id: ownerSession.id }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");

    const unchanged = await prisma.gameSession.findUniqueOrThrow({
      where: { id: ownerSession.id },
    });
    expect(unchanged.status).toBe("ACTIVE");
    expect(unchanged.currentSun).toBe(50);
    expect(unchanged.score).toBe(0);
  });
});
