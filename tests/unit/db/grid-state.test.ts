import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient, Prisma } from "@prisma/client";
import { createTestPrismaClient } from "@/lib/prisma-test";
import {
  isGridState,
  isZombieState,
  type GridState,
  type ZombieState,
  type StackedEntity,
  type ZombieInstance,
} from "@/types/game";

// Prisma's JSON InputJsonValue type cannot be structurally satisfied by our
// typed game interfaces (no index signature). These helpers bridge the gap
// without needing to add `[key: string]: unknown` to every game type.
function toJson<T>(v: T): Prisma.InputJsonValue {
  return v as unknown as Prisma.InputJsonValue;
}

function fromJson<T>(v: unknown): T {
  return v as unknown as T;
}

const prisma: PrismaClient = createTestPrismaClient();

async function seedUser() {
  return prisma.user.create({
    data: {
      email: `grid-${Math.random().toString(36).slice(2)}@example.com`,
      passwordHash: "hash",
      displayName: "Grid Tester",
    },
  });
}

async function createSession(userId: string) {
  return prisma.gameSession.create({
    data: {
      userId,
      environmentType: "DAY",
      waterLaneIndices: [],
    },
  });
}

function makeEntity(overrides: Partial<StackedEntity> = {}): StackedEntity {
  return {
    instanceId: `inst-${Math.random().toString(36).slice(2)}`,
    entityType: "PLANT",
    entityId: "peashooter",
    health: 300,
    maxHealth: 300,
    layer: "GROUND",
    zIndex: 0,
    extraState: null,
    ...overrides,
  };
}

function makeZombie(overrides: Partial<ZombieInstance> = {}): ZombieInstance {
  return {
    instanceId: `zomb-${Math.random().toString(36).slice(2)}`,
    zombieType: "NORMAL",
    lane: 0,
    xPosition: 9.0,
    health: 200,
    maxHealth: 200,
    armorLayers: 0,
    statusEffects: [],
    extraState: null,
    ...overrides,
  };
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

describe("GridState JSON column", () => {
  it("empty gridState [] stores and retrieves as an empty array", async () => {
    const user = await seedUser();
    const session = await createSession(user.id);

    const found = await prisma.gameSession.findUnique({
      where: { id: session.id },
    });
    expect(found?.gridState).toEqual([]);
  });

  it("single Peashooter on cell (0,0) with GROUND layer round-trips correctly", async () => {
    const user = await seedUser();
    const session = await createSession(user.id);

    const entity = makeEntity({ entityId: "peashooter", layer: "GROUND" });
    const gridState: GridState = [[{ row: 0, col: 0, entities: [entity] }]];

    await prisma.gameSession.update({
      where: { id: session.id },
      data: { gridState: toJson(gridState) },
    });

    const found = await prisma.gameSession.findUnique({
      where: { id: session.id },
    });
    const stored = fromJson<GridState>(found?.gridState);

    expect(stored[0][0].row).toBe(0);
    expect(stored[0][0].col).toBe(0);
    expect(stored[0][0].entities).toHaveLength(1);
    expect(stored[0][0].entities[0].entityId).toBe("peashooter");
    expect(stored[0][0].entities[0].layer).toBe("GROUND");
  });

  it("stacked entities: Lily Pad (WATER) + Peashooter (GROUND) on same cell", async () => {
    const user = await seedUser();
    const session = await createSession(user.id);

    const lilyPad = makeEntity({ entityId: "lily-pad", layer: "WATER", zIndex: 0 });
    const peashooter = makeEntity({ entityId: "peashooter", layer: "GROUND", zIndex: 1 });
    const gridState: GridState = [
      [{ row: 2, col: 3, entities: [lilyPad, peashooter] }],
    ];

    await prisma.gameSession.update({
      where: { id: session.id },
      data: { gridState: toJson(gridState) },
    });

    const found = await prisma.gameSession.findUnique({
      where: { id: session.id },
    });
    const cell = fromJson<GridState>(found?.gridState)[0][0];

    expect(cell.entities).toHaveLength(2);
    expect(cell.entities[0].entityId).toBe("lily-pad");
    expect(cell.entities[0].layer).toBe("WATER");
    expect(cell.entities[1].entityId).toBe("peashooter");
    expect(cell.entities[1].layer).toBe("GROUND");
  });

  it("zIndex is preserved in insertion order (consuming code is responsible for sorting)", async () => {
    const user = await seedUser();
    const session = await createSession(user.id);

    const e0 = makeEntity({ zIndex: 0 });
    const e1 = makeEntity({ zIndex: 1 });
    const gridState: GridState = [[{ row: 0, col: 0, entities: [e0, e1] }]];

    await prisma.gameSession.update({
      where: { id: session.id },
      data: { gridState: toJson(gridState) },
    });

    const found = await prisma.gameSession.findUnique({
      where: { id: session.id },
    });
    const entities = fromJson<GridState>(found?.gridState)[0][0].entities;
    expect(entities[0].zIndex).toBe(0);
    expect(entities[1].zIndex).toBe(1);
  });

  it("extraState stores Sunflower sun accumulation data and round-trips correctly", async () => {
    const user = await seedUser();
    const session = await createSession(user.id);

    const sunflower = makeEntity({
      entityId: "sunflower",
      extraState: { sunAccumulated: 25, lastSunProducedAt: 1234567890 },
    });
    const gridState: GridState = [[{ row: 0, col: 0, entities: [sunflower] }]];

    await prisma.gameSession.update({
      where: { id: session.id },
      data: { gridState: toJson(gridState) },
    });

    const found = await prisma.gameSession.findUnique({
      where: { id: session.id },
    });
    const stored = fromJson<GridState>(found?.gridState)[0][0].entities[0];
    expect(stored.extraState).toEqual({
      sunAccumulated: 25,
      lastSunProducedAt: 1234567890,
    });
  });

  it("extraState is null for entities that need no extra state", async () => {
    const user = await seedUser();
    const session = await createSession(user.id);

    const wallNut = makeEntity({ entityId: "wall-nut", extraState: null });
    const gridState: GridState = [[{ row: 1, col: 1, entities: [wallNut] }]];

    await prisma.gameSession.update({
      where: { id: session.id },
      data: { gridState: toJson(gridState) },
    });

    const found = await prisma.gameSession.findUnique({
      where: { id: session.id },
    });
    const stored = fromJson<GridState>(found?.gridState)[0][0].entities[0];
    expect(stored.extraState).toBeNull();
  });

  it("mid-game health update: fetch -> mutate health -> write back -> verify", async () => {
    const user = await seedUser();
    const session = await createSession(user.id);

    const entity = makeEntity({ entityId: "wall-nut", health: 4000, maxHealth: 4000 });
    await prisma.gameSession.update({
      where: { id: session.id },
      data: { gridState: toJson([[{ row: 0, col: 0, entities: [entity] }]]) },
    });

    // Simulate damage
    const current = await prisma.gameSession.findUnique({ where: { id: session.id } });
    const currentGrid = fromJson<GridState>(current?.gridState);
    currentGrid[0][0].entities[0].health = 2500;

    await prisma.gameSession.update({
      where: { id: session.id },
      data: { gridState: toJson(currentGrid) },
    });

    const after = await prisma.gameSession.findUnique({ where: { id: session.id } });
    expect(fromJson<GridState>(after?.gridState)[0][0].entities[0].health).toBe(2500);
  });

  it("removing an entity from a cell leaves entities array empty", async () => {
    const user = await seedUser();
    const session = await createSession(user.id);

    const entity = makeEntity({ entityType: "ZOMBIE", entityId: "normal" });
    await prisma.gameSession.update({
      where: { id: session.id },
      data: { gridState: toJson([[{ row: 3, col: 8, entities: [entity] }]]) },
    });

    // Remove by writing empty entities
    await prisma.gameSession.update({
      where: { id: session.id },
      data: { gridState: toJson([[{ row: 3, col: 8, entities: [] }]]) },
    });

    const found = await prisma.gameSession.findUnique({ where: { id: session.id } });
    expect(fromJson<GridState>(found?.gridState)[0][0].entities).toHaveLength(0);
  });

  it("ZombieInstance at xPosition=8.5 round-trips with float precision", async () => {
    const user = await seedUser();
    const session = await createSession(user.id);

    const zombie = makeZombie({ xPosition: 8.5, lane: 2 });
    const zombieState: ZombieState = [zombie];

    await prisma.gameSession.update({
      where: { id: session.id },
      data: { zombieState: toJson(zombieState) },
    });

    const found = await prisma.gameSession.findUnique({ where: { id: session.id } });
    const stored = fromJson<ZombieState>(found?.zombieState)[0];
    expect(stored.xPosition).toBe(8.5);
    expect(stored.lane).toBe(2);
  });

  it("ZombieInstance stores statusEffects with type and remainingMs", async () => {
    const user = await seedUser();
    const session = await createSession(user.id);

    const zombie = makeZombie({
      statusEffects: [{ type: "FROZEN", remainingMs: 3000 }],
    });
    const zombieState: ZombieState = [zombie];

    await prisma.gameSession.update({
      where: { id: session.id },
      data: { zombieState: toJson(zombieState) },
    });

    const found = await prisma.gameSession.findUnique({ where: { id: session.id } });
    const stored = fromJson<ZombieState>(found?.zombieState)[0];
    expect(stored.statusEffects).toHaveLength(1);
    expect(stored.statusEffects[0].type).toBe("FROZEN");
    expect(stored.statusEffects[0].remainingMs).toBe(3000);
  });

  it("full 5x9 grid with entities in all 45 cells round-trips correctly", async () => {
    const user = await seedUser();
    const session = await createSession(user.id);

    const fullGrid: GridState = [];
    for (let row = 0; row < 5; row++) {
      const rowCells = [];
      for (let col = 0; col < 9; col++) {
        rowCells.push({
          row,
          col,
          entities: [makeEntity({ entityId: col % 2 === 0 ? "peashooter" : "sunflower" })],
        });
      }
      fullGrid.push(rowCells);
    }

    await prisma.gameSession.update({
      where: { id: session.id },
      data: { gridState: toJson(fullGrid) },
    });

    const found = await prisma.gameSession.findUnique({ where: { id: session.id } });
    const stored = fromJson<GridState>(found?.gridState);

    expect(stored).toHaveLength(5);
    expect(stored[0]).toHaveLength(9);
    // Spot-check: row 2, col 4 should be a peashooter (col even)
    expect(stored[2][4].entities[0].entityId).toBe("peashooter");
    // Spot-check: row 4, col 7 should be a sunflower (col odd)
    expect(stored[4][7].entities[0].entityId).toBe("sunflower");
    // Spot-check: row 0, col 0
    expect(stored[0][0].row).toBe(0);
    expect(stored[0][0].col).toBe(0);
  });

  it("runtime type guard isGridState validates the deserialized JSON shape", async () => {
    const user = await seedUser();
    const session = await createSession(user.id);

    const entity = makeEntity();
    const gridState: GridState = [[{ row: 0, col: 0, entities: [entity] }]];

    await prisma.gameSession.update({
      where: { id: session.id },
      data: { gridState: toJson(gridState) },
    });

    const found = await prisma.gameSession.findUnique({ where: { id: session.id } });
    expect(isGridState(found?.gridState)).toBe(true);
    expect(isGridState(null)).toBe(false);
    expect(isGridState("not an array")).toBe(false);
    expect(isGridState([{ notARow: true }])).toBe(false);
  });
});
