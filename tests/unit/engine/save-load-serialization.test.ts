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
    expect(restored.zombieSpawnQueue).toEqual(state.zombieSpawnQueue);
    expect(restored.grid?.[1][6]).toMatchObject({
      isFog: false,
      graveId: "grave-restored",
    });
  });
});
