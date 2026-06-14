import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestPrismaClient } from "@/lib/prisma-test";
import type { SerializedGameState } from "@/lib/game-serializer";
import { POST as saveSession } from "@/app/api/game/sessions/[id]/save/route";
import { GET as loadSession } from "@/app/api/game/sessions/[id]/route";
import { prisma as routePrisma } from "@/lib/prisma";
import { hashSessionToken } from "@/lib/auth";

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

async function createAuthToken(userId: string): Promise<string> {
  const token = `test-token-${userId}`;
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

function createSaveRequest(
  sessionId: string,
  payload: SerializedGameState,
  token: string
): Request {
  return new Request(`http://localhost/api/game/sessions/${sessionId}/save`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/game/sessions/:id/save", () => {
  it("persists structured JSON fields so saved sessions load with runtime state intact", async () => {
    const user = await prisma.user.create({
      data: {
        email: "route-save-json@example.com",
        passwordHash: "hash",
        displayName: "Route Save Tester",
      },
    });
    const token = await createAuthToken(user.id);
    const session = await prisma.gameSession.create({
      data: {
        userId: user.id,
        environmentType: "DAY",
        waterLaneIndices: [],
        levelNumber: 1,
      },
    });

    const payload: SerializedGameState = {
      gameTimeMs: 12_000,
      environmentState: {
        gridCells: [
          {
            row: 0,
            col: 0,
            isWater: false,
            isFog: false,
            isSlope: false,
            graveId: "grave-1",
          },
        ],
        nextSkyDropTimerMs: 4_500,
      },
      graveState: [{ row: 0, col: 0, graveId: "grave-1" }],
      gridState: [
        [
          {
            row: 0,
            col: 0,
            entities: [
              {
                instanceId: "plant-peashooter-1",
                entityType: "PLANT",
                entityId: "PEASHOOTER",
                health: 260,
                maxHealth: 300,
                layer: "GROUND",
                zIndex: 1,
                extraState: null,
              },
            ],
          },
        ],
      ],
      zombieState: [
        {
          instanceId: "zombie-normal-1",
          zombieType: "NORMAL",
          lane: 0,
          xPosition: 7.25,
          health: 180,
          maxHealth: 200,
          armorLayers: 0,
          statusEffects: [{ type: "SLOWED", remainingMs: 1500 }],
          extraState: {
            armorHealth: 0,
            isEating: false,
            eatTargetId: null,
            speedColsPerSec: 1 / 4.7,
            eatDamagePerSec: 100,
          },
        },
      ],
      projectileState: [
        {
          instanceId: "projectile-pea-1",
          projectileType: "PEA",
          lane: 0,
          x: 2.5,
          y: 0,
          velX: 5,
          velY: 0,
          damage: 20,
          trajectory: "straight",
          sourceCol: 0,
        },
      ],
      sunDropState: [
        {
          instanceId: "sun-sky-1",
          x: 4.5,
          y: 1.25,
          targetY: 3,
          value: 25,
          source: "sky",
          state: "falling",
          spawnedAtMs: 10_000,
          lifetimeMs: 10_000,
        },
      ],
      lawnMowerState: [],
      spawnQueueState: [{ zombieType: "CONEHEAD", lane: 1, spawnAtMs: 15_000, x: 9.5 }],
      seedCooldowns: {
        peashooter: 1234,
        sunflower: 0,
      },
      loadoutSnapshot: ["PEASHOOTER", "SUNFLOWER"],
      currentSun: 75,
      cumulativeSun: 125,
      score: 250,
      waveNumber: 2,
      nextWaveTimerMs: 8500,
      totalZombiesKilled: 3,
    };

    const saveResponse = await saveSession(createSaveRequest(session.id, payload, token), {
      params: Promise.resolve({ id: session.id }),
    });

    expect(saveResponse.status).toBe(200);

    const saved = await prisma.gameSession.findUniqueOrThrow({
      where: { id: session.id },
    });

    expect(saved.status).toBe("PAUSED");
    expect(saved.gameTimeMs).toBe(12_000);
    expect(saved.environmentState).toEqual(payload.environmentState);
    expect(saved.graveState).toEqual(payload.graveState);
    expect(Array.isArray(saved.gridState)).toBe(true);
    expect(Array.isArray(saved.zombieState)).toBe(true);
    expect(saved.projectileState).toEqual(payload.projectileState);
    expect(saved.sunDropState).toEqual(payload.sunDropState);
    expect(saved.spawnQueueState).toEqual(payload.spawnQueueState);
    expect(typeof saved.seedCooldowns).toBe("object");
    expect(Array.isArray(saved.loadoutSnapshot)).toBe(true);
    expect(saved.gridState).toEqual(payload.gridState);
    expect(saved.zombieState).toEqual(payload.zombieState);
    expect(saved.seedCooldowns).toEqual(payload.seedCooldowns);
    expect(saved.loadoutSnapshot).toEqual(payload.loadoutSnapshot);

    const loadResponse = await loadSession(
      new Request(`http://localhost/api/game/sessions/${session.id}`, {
        headers: authHeaders(token),
      }),
      {
        params: Promise.resolve({ id: session.id }),
      }
    );
    const loaded = await loadResponse.json();

    expect(loadResponse.status).toBe(200);
    expect(loaded.state.plants["plant-peashooter-1"]).toMatchObject({
      plantType: "PEASHOOTER",
      row: 0,
      col: 0,
      health: 260,
    });
    expect(loaded.state.zombies["zombie-normal-1"]).toMatchObject({
      zombieType: "NORMAL",
      lane: 0,
      x: 7.25,
      health: 180,
    });
    expect(loaded.state.projectiles["projectile-pea-1"]).toMatchObject({
      projectileType: "PEA",
      lane: 0,
      x: 2.5,
      damage: 20,
    });
    expect(loaded.state.sunDrops["sun-sky-1"]).toMatchObject({
      source: "sky",
      state: "falling",
      value: 25,
    });
    expect(loaded.state.zombieSpawnQueue).toEqual([
      { zombieType: "CONEHEAD", lane: 1, spawnAtMs: 15_000, x: 9.5 },
    ]);
    expect(loaded.state.loadout[0]).toMatchObject({
      plantType: "PEASHOOTER",
      cooldownRemainingMs: 1234,
    });
    expect(loaded.state.currentSun).toBe(75);
    expect(loaded.state.gameTimeMs).toBe(12_000);
    expect(loaded.state.nextWaveAtMs).toBe(20_500);
    expect(loaded.state.nextSkyDropAtMs).toBe(16_500);
    expect(loaded.state.grid[0][0]).toMatchObject({
      isFog: false,
      graveId: "grave-1",
    });
  });
});
