import { describe, expect, it } from "vitest";
import { deserializeGameState } from "@/lib/game-deserializer";
import { serializeGameState } from "@/lib/game-serializer";
import { generateGrid } from "@/engine/grid";
import type { EnvironmentConfig, GameEngineState } from "@/engine/types";

describe("save/load serialization", () => {
  it("round-trips volatile pause state with projectiles, sun drops, spawn queue, and timers", () => {
    const environment: EnvironmentConfig = {
      type: "FOG",
      gridRows: 6,
      gridCols: 9,
      waterLaneIndices: [2, 3],
      gravesEnabled: false,
      fogEnabled: true,
      slopeEnabled: false,
      conveyorBelt: false,
      skyDropSun: false,
    };
    const grid = generateGrid(environment);
    grid[1][6].isFog = false;
    grid[1][6].graveId = "grave-restored";
    grid[1][6].craterExpiresAtMs = 190_000;

    const state: GameEngineState = {
      status: "paused",
      environment,
      grid,
      plants: {},
      zombies: {},
      projectiles: {
        "projectile-cabbage-1": {
          instanceId: "projectile-cabbage-1",
          projectileType: "CABBAGE",
          lane: 1,
          x: 3.25,
          y: 0.75,
          velX: 2.5,
          velY: 3,
          damage: 40,
          trajectory: "lobbed",
          sourceCol: 2,
          targetCol: 6,
          targetLane: 1,
        },
      },
      sunDrops: {
        "sun-plant-1": {
          instanceId: "sun-plant-1",
          x: 1,
          y: 2,
          targetY: 2,
          value: 25,
          source: "plant",
          state: "landed",
          spawnedAtMs: 4_000,
          lifetimeMs: 10_000,
        },
      },
      lawnMowers: {
        "mower-1": {
          instanceId: "mower-1",
          lane: 1,
          x: 3.5,
          state: "active",
          speedColsPerSec: 6,
          triggeredAtMs: 9_000,
        },
      },
      currentSun: 125,
      cumulativeSun: 300,
      gameTimeMs: 10_000,
      waveNumber: 4,
      nextWaveAtMs: 18_000,
      score: 750,
      totalZombiesKilled: 9,
      loadout: [
        {
          plantType: "PEASHOOTER",
          plantId: "peashooter",
          sunCost: 100,
          cooldownRemainingMs: 2_000,
          cooldownTotalMs: 7_000,
          isSelected: false,
          slotIndex: 0,
        },
      ],
      selectedSlot: null,
      nextSkyDropAtMs: 16_000,
      zombieSpawnQueue: [
        { zombieType: "CONEHEAD", lane: 1, spawnAtMs: 12_000, x: 9.5 },
      ],
    };

    const serialized = serializeGameState(state);
    const restored = deserializeGameState(
      {
        gameTimeMs: serialized.gameTimeMs,
        environmentState: serialized.environmentState,
        graveState: serialized.graveState,
        gridState: serialized.gridState,
        zombieState: serialized.zombieState,
        projectileState: serialized.projectileState,
        sunDropState: serialized.sunDropState,
        lawnMowerState: serialized.lawnMowerState,
        spawnQueueState: serialized.spawnQueueState,
        seedCooldowns: serialized.seedCooldowns,
        loadoutSnapshot: serialized.loadoutSnapshot,
        currentSun: serialized.currentSun,
        cumulativeSun: serialized.cumulativeSun,
        score: serialized.score,
        waveNumber: serialized.waveNumber,
        nextWaveTimerMs: serialized.nextWaveTimerMs,
        totalZombiesKilled: serialized.totalZombiesKilled,
        environmentType: environment.type,
        gridRows: environment.gridRows,
        gridCols: environment.gridCols,
        waterLaneIndices: environment.waterLaneIndices,
        gravesEnabled: environment.gravesEnabled,
        fogEnabled: environment.fogEnabled,
        slopeEnabled: environment.slopeEnabled,
        conveyorBelt: environment.conveyorBelt,
      },
      0
    );

    expect(serialized.projectileState).toHaveLength(1);
    expect(serialized.sunDropState).toHaveLength(1);
    expect(serialized.lawnMowerState).toHaveLength(1);
    expect(serialized.spawnQueueState).toEqual(state.zombieSpawnQueue);
    expect(serialized.environmentState.nextSkyDropTimerMs).toBe(6_000);

    expect(restored.gameTimeMs).toBe(10_000);
    expect(restored.nextWaveAtMs).toBe(18_000);
    expect(restored.nextSkyDropAtMs).toBe(16_000);
    expect(restored.projectiles?.["projectile-cabbage-1"]).toMatchObject({
      projectileType: "CABBAGE",
      trajectory: "lobbed",
      targetCol: 6,
    });
    expect(restored.sunDrops?.["sun-plant-1"]).toMatchObject({
      source: "plant",
      state: "landed",
      value: 25,
    });
    expect(restored.lawnMowers?.["mower-1"]).toMatchObject({
      lane: 1,
      x: 3.5,
      state: "active",
      triggeredAtMs: 9_000,
    });
    expect(restored.zombieSpawnQueue).toEqual(state.zombieSpawnQueue);
    expect(restored.grid?.[1][6]).toMatchObject({
      isFog: false,
      graveId: "grave-restored",
      craterExpiresAtMs: 190_000,
    });
  });

  it("preserves partially damaged zombie armor separately from base health", () => {
    const environment: EnvironmentConfig = {
      type: "DAY",
      gridRows: 5,
      gridCols: 9,
      waterLaneIndices: [],
      gravesEnabled: false,
      fogEnabled: false,
      slopeEnabled: false,
      conveyorBelt: false,
      skyDropSun: true,
    };
    const state: GameEngineState = {
      status: "paused",
      environment,
      grid: generateGrid(environment),
      plants: {},
      zombies: {
        "zombie-buckethead-1": {
          instanceId: "zombie-buckethead-1",
          zombieType: "BUCKETHEAD",
          lane: 2,
          x: 6.75,
          health: 200,
          maxHealth: 200,
          armorHealth: 640,
          speedColsPerSec: 1 / 4.7,
          eatDamagePerSec: 100,
          isEating: false,
          eatTargetId: null,
          statusEffects: [],
          isUnderground: false,
          isAerial: false,
          isFrozen: false,
        },
      },
      projectiles: {},
      sunDrops: {},
      lawnMowers: {},
      currentSun: 50,
      cumulativeSun: 0,
      gameTimeMs: 5_000,
      waveNumber: 1,
      nextWaveAtMs: 20_000,
      score: 0,
      totalZombiesKilled: 0,
      loadout: [],
      selectedSlot: null,
      nextSkyDropAtMs: 15_000,
      zombieSpawnQueue: [],
    };

    const serialized = serializeGameState(state);
    const zombie = serialized.zombieState[0];

    expect(zombie.health).toBe(200);
    expect(zombie.extraState?.armorHealth).toBe(640);

    const restored = deserializeGameState(
      {
        gameTimeMs: serialized.gameTimeMs,
        environmentState: serialized.environmentState,
        graveState: serialized.graveState,
        gridState: serialized.gridState,
        zombieState: serialized.zombieState,
        projectileState: serialized.projectileState,
        sunDropState: serialized.sunDropState,
        lawnMowerState: serialized.lawnMowerState,
        spawnQueueState: serialized.spawnQueueState,
        seedCooldowns: serialized.seedCooldowns,
        loadoutSnapshot: serialized.loadoutSnapshot,
        currentSun: serialized.currentSun,
        cumulativeSun: serialized.cumulativeSun,
        score: serialized.score,
        waveNumber: serialized.waveNumber,
        nextWaveTimerMs: serialized.nextWaveTimerMs,
        totalZombiesKilled: serialized.totalZombiesKilled,
        environmentType: environment.type,
        gridRows: environment.gridRows,
        gridCols: environment.gridCols,
        waterLaneIndices: environment.waterLaneIndices,
        gravesEnabled: environment.gravesEnabled,
        fogEnabled: environment.fogEnabled,
        slopeEnabled: environment.slopeEnabled,
        conveyorBelt: environment.conveyorBelt,
      },
      0
    );

    expect(restored.zombies?.["zombie-buckethead-1"]).toMatchObject({
      zombieType: "BUCKETHEAD",
      health: 200,
      armorHealth: 640,
    });
  });
});
