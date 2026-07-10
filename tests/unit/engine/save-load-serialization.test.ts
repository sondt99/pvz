import { describe, expect, it } from "vitest";
import { deserializeGameState } from "@/lib/game-deserializer";
import { serializeGameState, type SerializedGameState } from "@/lib/game-serializer";
import { generateGrid } from "@/engine/grid";
import type { EnvironmentConfig, GameEngineState } from "@/engine/types";

// Every test in this file serializes a GameEngineState, then feeds it back through
// deserializeGameState wrapped in the SessionData shape a real API route would supply.
// This helper is that wrapping — kept in one place so a new SessionData field only
// needs threading through once instead of once per test.
function restoreFrom(serialized: SerializedGameState, environment: EnvironmentConfig) {
  return deserializeGameState(
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
      skyDropSun: environment.skyDropSun,
    },
    0
  );
}

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
      rngState: 123_456_789,
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
      waveConfig: {
        finalWaveNumber: 1,
        waves: [
          {
            waveNumber: 1,
            entries: [{ zombieType: "NORMAL", lane: 1, spawnAtMs: 0 }],
            final: true,
          },
        ],
      },
      zombieSpawnQueue: [
        { zombieType: "CONEHEAD", lane: 1, spawnAtMs: 12_000, x: 9.5 },
      ],
      lastPlacementFailure: null,
    };

    const serialized = serializeGameState(state);
    const restored = restoreFrom(serialized, environment);

    expect(serialized.projectileState).toHaveLength(1);
    expect(serialized.sunDropState).toHaveLength(1);
    expect(serialized.lawnMowerState).toHaveLength(1);
    expect(serialized.spawnQueueState).toEqual(state.zombieSpawnQueue);
    expect(serialized.environmentState.nextSkyDropTimerMs).toBe(6_000);
    expect(serialized.environmentState.rngState).toBe(123_456_789);
    expect(serialized.environmentState.waveConfig).toEqual(state.waveConfig);

    expect(restored.gameTimeMs).toBe(10_000);
    expect(restored.nextWaveAtMs).toBe(18_000);
    expect(restored.nextSkyDropAtMs).toBe(16_000);
    expect(restored.rngState).toBe(123_456_789);
    expect(restored.waveConfig).toEqual(state.waveConfig);
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

  it("preserves zombie armor, bypasser movement fields, and boss action fields", () => {
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
        "zombie-digger-1": {
          instanceId: "zombie-digger-1",
          zombieType: "DIGGER",
          lane: 0,
          x: 0.15,
          health: 200,
          maxHealth: 200,
          armorHealth: 0,
          speedColsPerSec: 1 / 6.2,
          eatDamagePerSec: 100,
          isEating: false,
          eatTargetId: null,
          statusEffects: [],
          isUnderground: false,
          isAerial: false,
          isFrozen: false,
          direction: "right",
          emergeUntilMs: 9_000,
        },
        "zombie-pogo-1": {
          instanceId: "zombie-pogo-1",
          zombieType: "POGO",
          lane: 1,
          x: 3.35,
          health: 200,
          maxHealth: 200,
          armorHealth: 0,
          speedColsPerSec: 1 / 4.7,
          eatDamagePerSec: 100,
          isEating: false,
          eatTargetId: null,
          statusEffects: [],
          isUnderground: false,
          isAerial: false,
          isFrozen: false,
          direction: "left",
          pogoStickActive: false,
        },
        "zombie-gargantuar-1": {
          instanceId: "zombie-gargantuar-1",
          zombieType: "GARGANTUAR",
          lane: 2,
          x: 4.25,
          health: 1500,
          maxHealth: 3000,
          armorHealth: 0,
          speedColsPerSec: 1 / 6.2,
          eatDamagePerSec: 1800,
          isEating: false,
          eatTargetId: null,
          statusEffects: [],
          isUnderground: false,
          isAerial: false,
          isFrozen: false,
          direction: "left",
          hasThrownImp: true,
          smashUntilMs: 6_500,
        },
        "zombie-dancing-1": {
          instanceId: "zombie-dancing-1",
          zombieType: "DANCING",
          lane: 3,
          x: 5.5,
          health: 200,
          maxHealth: 200,
          armorHealth: 0,
          speedColsPerSec: 1 / 4.7,
          eatDamagePerSec: 100,
          isEating: false,
          eatTargetId: null,
          statusEffects: [],
          isUnderground: false,
          isAerial: false,
          isFrozen: false,
          hasCalledDancers: true,
        },
        "zombie-jackbox-1": {
          instanceId: "zombie-jackbox-1",
          zombieType: "JACK_IN_THE_BOX",
          lane: 4,
          x: 3.1,
          health: 200,
          maxHealth: 200,
          armorHealth: 0,
          speedColsPerSec: 1 / 4.7,
          eatDamagePerSec: 100,
          isEating: false,
          eatTargetId: null,
          statusEffects: [],
          isUnderground: false,
          isAerial: false,
          isFrozen: false,
          jackboxExplodeAtMs: 22_000,
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
      rngState: 987_654_321,
      score: 0,
      totalZombiesKilled: 0,
      loadout: [],
      selectedSlot: null,
      nextSkyDropAtMs: 15_000,
      zombieSpawnQueue: [],
      lastPlacementFailure: null,
    };

    const serialized = serializeGameState(state);
    const zombie = serialized.zombieState[0];
    const digger = serialized.zombieState.find((entry) => entry.instanceId === "zombie-digger-1");
    const pogo = serialized.zombieState.find((entry) => entry.instanceId === "zombie-pogo-1");
    const gargantuar = serialized.zombieState.find((entry) => entry.instanceId === "zombie-gargantuar-1");
    const dancing = serialized.zombieState.find((entry) => entry.instanceId === "zombie-dancing-1");
    const jackbox = serialized.zombieState.find((entry) => entry.instanceId === "zombie-jackbox-1");

    expect(zombie.health).toBe(200);
    expect(zombie.extraState?.armorHealth).toBe(640);
    expect(digger?.extraState).toMatchObject({ direction: "right", emergeUntilMs: 9_000 });
    expect(pogo?.extraState).toMatchObject({ direction: "left", pogoStickActive: false });
    expect(gargantuar?.extraState).toMatchObject({ hasThrownImp: true, smashUntilMs: 6_500 });
    expect(dancing?.extraState).toMatchObject({ hasCalledDancers: true });
    expect(jackbox?.extraState).toMatchObject({ jackboxExplodeAtMs: 22_000 });

    const restored = restoreFrom(serialized, environment);

    expect(restored.zombies?.["zombie-buckethead-1"]).toMatchObject({
      zombieType: "BUCKETHEAD",
      health: 200,
      armorHealth: 640,
    });
    expect(restored.zombies?.["zombie-digger-1"]).toMatchObject({
      zombieType: "DIGGER",
      direction: "right",
      emergeUntilMs: 9_000,
      isUnderground: false,
    });
    expect(restored.zombies?.["zombie-pogo-1"]).toMatchObject({
      zombieType: "POGO",
      direction: "left",
      pogoStickActive: false,
    });
    expect(restored.zombies?.["zombie-gargantuar-1"]).toMatchObject({
      zombieType: "GARGANTUAR",
      hasThrownImp: true,
      smashUntilMs: 6_500,
    });
    // Regression: a Dancing Zombie that already called its backup dancers must not
    // re-summon them after a reload, and a Jack-in-the-Box that hasn't exploded yet
    // must keep its explosion timer instead of becoming permanently inert.
    expect(restored.zombies?.["zombie-dancing-1"]).toMatchObject({
      zombieType: "DANCING",
      hasCalledDancers: true,
    });
    expect(restored.zombies?.["zombie-jackbox-1"]).toMatchObject({
      zombieType: "JACK_IN_THE_BOX",
      jackboxExplodeAtMs: 22_000,
    });
  });

  it("round-trips Pumpkin as an armor layer over a protected plant", () => {
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
    const grid = generateGrid(environment);
    const peashooter = {
      instanceId: "plant-peashooter-1",
      plantType: "PEASHOOTER",
      row: 0,
      col: 0,
      health: 300,
      maxHealth: 300,
      lastAttackAtMs: 0,
      lastSunAtMs: 0,
      plantedAtMs: 0,
      isSleeping: false,
      isCharging: false,
      chargeEndsAtMs: 0,
      armedAtMs: null,
      blocksAerial: false,
    };
    const pumpkin = {
      instanceId: "plant-pumpkin-1",
      plantType: "PUMPKIN",
      row: 0,
      col: 0,
      health: 3500,
      maxHealth: 4000,
      lastAttackAtMs: 0,
      lastSunAtMs: 0,
      plantedAtMs: 0,
      isSleeping: false,
      isCharging: false,
      chargeEndsAtMs: 0,
      armedAtMs: null,
      blocksAerial: false,
    };
    grid[0][0].plantInstanceId = peashooter.instanceId;
    grid[0][0].pumpkinInstanceId = pumpkin.instanceId;

    const state: GameEngineState = {
      status: "paused",
      environment,
      grid,
      plants: {
        [peashooter.instanceId]: peashooter,
        [pumpkin.instanceId]: pumpkin,
      },
      zombies: {},
      projectiles: {},
      sunDrops: {},
      lawnMowers: {},
      currentSun: 50,
      cumulativeSun: 0,
      gameTimeMs: 5_000,
      waveNumber: 1,
      nextWaveAtMs: 20_000,
      rngState: 246_813_579,
      score: 0,
      totalZombiesKilled: 0,
      loadout: [],
      selectedSlot: null,
      nextSkyDropAtMs: 15_000,
      zombieSpawnQueue: [],
      lastPlacementFailure: null,
    };

    const serialized = serializeGameState(state);
    expect(serialized.gridState[0][0].entities.map((entity) => entity.layer)).toEqual([
      "GROUND",
      "ARMOR",
    ]);

    const restored = restoreFrom(serialized, environment);

    expect(restored.grid?.[0][0].plantInstanceId).toBe(peashooter.instanceId);
    expect(restored.grid?.[0][0].pumpkinInstanceId).toBe(pumpkin.instanceId);
    expect(restored.plants?.[pumpkin.instanceId]).toMatchObject({
      plantType: "PUMPKIN",
      health: 3500,
    });
  });

  it("round-trips a plant's plantedAtMs so Puff-shroom lifetime and Sun-shroom growth stay correct after reload", () => {
    const environment: EnvironmentConfig = {
      type: "NIGHT",
      gridRows: 5,
      gridCols: 9,
      waterLaneIndices: [],
      gravesEnabled: true,
      fogEnabled: false,
      slopeEnabled: false,
      conveyorBelt: false,
      skyDropSun: false,
    };
    const grid = generateGrid(environment);
    const puffShroom = {
      instanceId: "plant-puffshroom-1",
      plantType: "PUFF_SHROOM",
      row: 2,
      col: 4,
      health: 300,
      maxHealth: 300,
      lastAttackAtMs: 0,
      lastSunAtMs: 0,
      plantedAtMs: 3_000,
      isSleeping: false,
      isCharging: false,
      chargeEndsAtMs: 0,
      armedAtMs: null,
      blocksAerial: false,
    };
    grid[2][4].plantInstanceId = puffShroom.instanceId;

    const state: GameEngineState = {
      status: "paused",
      environment,
      grid,
      plants: { [puffShroom.instanceId]: puffShroom },
      zombies: {},
      projectiles: {},
      sunDrops: {},
      lawnMowers: {},
      currentSun: 50,
      cumulativeSun: 0,
      gameTimeMs: 60_000,
      waveNumber: 1,
      nextWaveAtMs: 90_000,
      rngState: 111_222_333,
      score: 0,
      totalZombiesKilled: 0,
      loadout: [],
      selectedSlot: null,
      nextSkyDropAtMs: 30_000,
      zombieSpawnQueue: [],
      lastPlacementFailure: null,
    };

    const serialized = serializeGameState(state);
    const entity = serialized.gridState[2][4].entities.find(
      (e) => e.instanceId === puffShroom.instanceId
    );
    expect(entity?.extraState).toMatchObject({ plantedAtMs: 3_000 });

    const restored = restoreFrom(serialized, environment);

    expect(restored.plants?.[puffShroom.instanceId]?.plantedAtMs).toBe(3_000);
  });

  it("restores skyDropSun from the persisted session value for POOL (not just DAY/ROOF)", () => {
    const environment: EnvironmentConfig = {
      type: "POOL",
      gridRows: 6,
      gridCols: 9,
      waterLaneIndices: [2, 3],
      gravesEnabled: false,
      fogEnabled: false,
      slopeEnabled: false,
      conveyorBelt: false,
      skyDropSun: true,
    };
    const grid = generateGrid(environment);

    const state: GameEngineState = {
      status: "paused",
      environment,
      grid,
      plants: {},
      zombies: {},
      projectiles: {},
      sunDrops: {},
      lawnMowers: {},
      currentSun: 50,
      cumulativeSun: 0,
      gameTimeMs: 1_000,
      waveNumber: 1,
      nextWaveAtMs: 30_000,
      rngState: 444_555_666,
      score: 0,
      totalZombiesKilled: 0,
      loadout: [],
      selectedSlot: null,
      nextSkyDropAtMs: 8_000,
      zombieSpawnQueue: [],
      lastPlacementFailure: null,
    };

    const serialized = serializeGameState(state);
    const restored = restoreFrom(serialized, environment);

    expect(restored.environment?.skyDropSun).toBe(true);
  });
});
