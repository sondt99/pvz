/**
 * End-to-end deterministic level simulations.
 * Each test drives the engine via tick() from a fresh start until the game
 * reaches a terminal state (victory or game-over) or a safety timeout fires.
 *
 * Wave configs are intentionally minimal (1-3 zombies) so the full game
 * completes in reasonable time without CPU-heavy full-length sims.
 * All RNG seeds are fixed, making the runs 100% reproducible.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "@/store/game-store";
import { GRID_COLS, GRID_ROWS_POOL, GRID_ROWS_STANDARD } from "@/engine/constants";
import { getPlantDef } from "@/engine/entities/plant-defs";
import { parseWaveConfig } from "@/engine/wave-generator";
import type { EnvironmentConfig, SeedPacketSlot } from "@/engine/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TICK_MS = 200;
const MAX_GAME_MS = 120_000; // 2 min simulated — more than enough for minimal waves

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSlot(plantType: string, slotIndex: number): SeedPacketSlot {
  const def = getPlantDef(plantType);
  return {
    plantType,
    plantId: plantType,
    sunCost: def.sunCost,
    cooldownRemainingMs: 0,
    cooldownTotalMs: def.rechargeTime * 1000,
    isSelected: false,
    slotIndex,
  };
}

function runUntilTerminal(): "victory" | "game-over" | "timeout" {
  let elapsed = 0;
  while (elapsed < MAX_GAME_MS) {
    useGameStore.getState().tick(TICK_MS);
    const status = useGameStore.getState().status;
    if (status === "victory" || status === "game-over") return status;
    elapsed += TICK_MS;
  }
  return "timeout";
}

/**
 * Validates no impossible state:
 * - no plant with negative health
 * - no zombie with negative health
 * - no orphan grid pointers (grid cell references a plant that no longer exists)
 * - no zombie eating a plant that no longer exists
 */
function assertNoImpossibleState() {
  const state = useGameStore.getState();

  for (const plant of Object.values(state.plants)) {
    expect(plant.health, `${plant.plantType}@${plant.row},${plant.col} has negative health`).toBeGreaterThan(0);
  }

  for (const zombie of Object.values(state.zombies)) {
    expect(zombie.health, `${zombie.zombieType} has negative health`).toBeGreaterThan(0);
    if (zombie.eatTargetId !== null) {
      expect(
        state.plants[zombie.eatTargetId],
        `zombie ${zombie.zombieType} eatTarget ${zombie.eatTargetId} is orphaned`
      ).toBeDefined();
    }
  }

  for (const row of state.grid) {
    for (const cell of row) {
      if (cell.plantInstanceId !== null) {
        expect(
          state.plants[cell.plantInstanceId],
          `cell ${cell.row},${cell.col} has orphan plantInstanceId`
        ).toBeDefined();
      }
      if (cell.lilyPadInstanceId !== null) {
        expect(
          state.plants[cell.lilyPadInstanceId],
          `cell ${cell.row},${cell.col} has orphan lilyPadInstanceId`
        ).toBeDefined();
      }
      if (cell.flowerPotInstanceId !== null) {
        expect(
          state.plants[cell.flowerPotInstanceId],
          `cell ${cell.row},${cell.col} has orphan flowerPotInstanceId`
        ).toBeDefined();
      }
    }
  }
}

// Single-wave config: N NORMAL zombies spawning immediately in lane 0
function oneWaveConfig(count: number) {
  return parseWaveConfig({
    finalWaveNumber: 1,
    waves: [
      {
        waveNumber: 1,
        entries: Array.from({ length: count }, (_, i) => ({
          zombieType: "NORMAL",
          lane: 0,
          spawnAtMs: i * 500,
        })),
        final: true,
      },
    ],
  });
}

// Winning config: Cherry Bomb at lane 0, col 4 destroys incoming zombies + peashooter for cleanup
function setupWinnerDAY(env: EnvironmentConfig) {
  const loadout = [
    makeSlot("PEASHOOTER", 0),
    makeSlot("CHERRY_BOMB", 1),
    makeSlot("SUNFLOWER", 2),
  ];
  const store = useGameStore.getState();
  store.initGame(env, loadout);
  store.startGame();
  useGameStore.setState({
    currentSun: 5000,
    nextWaveAtMs: 500,
    waveConfig: oneWaveConfig(2),
    rngState: 42,
  });
  store.placePlant("PEASHOOTER", 0, 0);
  store.placePlant("PEASHOOTER", 0, 1);
  store.placePlant("PEASHOOTER", 0, 2);
  store.placePlant("PEASHOOTER", 0, 3);
}

beforeEach(() => {
  useGameStore.getState().reset();
});

// ---------------------------------------------------------------------------
// DAY
// ---------------------------------------------------------------------------

describe("DAY — end-to-end simulations", () => {
  const env: EnvironmentConfig = {
    type: "DAY",
    gridRows: GRID_ROWS_STANDARD,
    gridCols: GRID_COLS,
    waterLaneIndices: [],
    gravesEnabled: false,
    fogEnabled: false,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: true,
  };

  it("reaches victory when peashooters cover lane 0 vs 2 NORMAL zombies", () => {
    setupWinnerDAY(env);
    const result = runUntilTerminal();
    expect(result, "should not time out").not.toBe("timeout");
    expect(result).toBe("victory");
    expect(useGameStore.getState().totalZombiesKilled).toBeGreaterThanOrEqual(2);
  });

  it("reaches game-over when no plants are placed and zombies walk through", () => {
    const store = useGameStore.getState();
    store.initGame(env, [makeSlot("PEASHOOTER", 0)]);
    store.startGame();
    // Remove lawnmowers so the first zombie to breach lane 0 triggers game-over immediately
    useGameStore.setState({
      nextWaveAtMs: 500,
      waveConfig: oneWaveConfig(1),
      rngState: 42,
      lawnMowers: {},
    });
    const result = runUntilTerminal();
    expect(result, "should not time out").not.toBe("timeout");
    expect(result).toBe("game-over");
  });

  it("has no impossible state at termination", () => {
    setupWinnerDAY(env);
    runUntilTerminal();
    assertNoImpossibleState();
  });
});

// ---------------------------------------------------------------------------
// NIGHT
// ---------------------------------------------------------------------------

describe("NIGHT — end-to-end simulations", () => {
  const env: EnvironmentConfig = {
    type: "NIGHT",
    gridRows: GRID_ROWS_STANDARD,
    gridCols: GRID_COLS,
    waterLaneIndices: [],
    gravesEnabled: true,
    fogEnabled: false,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: false,
  };

  it("reaches victory with sun-shroom + fume-shroom vs 2 NORMAL zombies", () => {
    const loadout = [
      makeSlot("SUN_SHROOM", 0),
      makeSlot("FUME_SHROOM", 1),
      makeSlot("PUFF_SHROOM", 2),
    ];
    const store = useGameStore.getState();
    store.initGame(env, loadout);
    store.startGame();
    useGameStore.setState({
      currentSun: 5000,
      nextWaveAtMs: 500,
      waveConfig: oneWaveConfig(2),
      rngState: 99,
    });
    store.placePlant("FUME_SHROOM", 0, 0);
    store.placePlant("FUME_SHROOM", 0, 1);
    store.placePlant("FUME_SHROOM", 0, 2);
    store.placePlant("FUME_SHROOM", 0, 3);

    const result = runUntilTerminal();
    expect(result).not.toBe("timeout");
    expect(result).toBe("victory");
  });

  it("reaches game-over with no plants", () => {
    const store = useGameStore.getState();
    store.initGame(env, [makeSlot("SUN_SHROOM", 0)]);
    store.startGame();
    useGameStore.setState({ nextWaveAtMs: 500, waveConfig: oneWaveConfig(1), rngState: 99, lawnMowers: {} });
    const result = runUntilTerminal();
    expect(result).not.toBe("timeout");
    expect(result).toBe("game-over");
  });

  it("has no impossible state at termination", () => {
    const loadout = [makeSlot("FUME_SHROOM", 0)];
    const store = useGameStore.getState();
    store.initGame(env, loadout);
    store.startGame();
    useGameStore.setState({
      currentSun: 5000,
      nextWaveAtMs: 500,
      waveConfig: oneWaveConfig(2),
      rngState: 99,
    });
    store.placePlant("FUME_SHROOM", 0, 0);
    store.placePlant("FUME_SHROOM", 0, 1);
    store.placePlant("FUME_SHROOM", 0, 2);
    store.placePlant("FUME_SHROOM", 0, 3);
    runUntilTerminal();
    assertNoImpossibleState();
  });
});

// ---------------------------------------------------------------------------
// POOL
// ---------------------------------------------------------------------------

describe("POOL — end-to-end simulations", () => {
  const env: EnvironmentConfig = {
    type: "POOL",
    gridRows: GRID_ROWS_POOL,
    gridCols: GRID_COLS,
    waterLaneIndices: [2, 3],
    gravesEnabled: false,
    fogEnabled: false,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: true,
  };

  it("reaches victory with peashooters on land and sea-shrooms on water vs 2 zombies", () => {
    const loadout = [
      makeSlot("PEASHOOTER", 0),
      makeSlot("SEA_SHROOM", 1),
      makeSlot("LILY_PAD", 2),
    ];
    const store = useGameStore.getState();
    store.initGame(env, loadout);
    store.startGame();
    useGameStore.setState({
      currentSun: 5000,
      nextWaveAtMs: 500,
      waveConfig: oneWaveConfig(2),
      rngState: 1337,
    });
    // Land lanes
    store.placePlant("PEASHOOTER", 0, 0);
    store.placePlant("PEASHOOTER", 0, 1);
    store.placePlant("PEASHOOTER", 0, 2);
    store.placePlant("PEASHOOTER", 0, 3);

    const result = runUntilTerminal();
    expect(result).not.toBe("timeout");
    expect(result).toBe("victory");
  });

  it("reaches game-over with no plants in a POOL environment", () => {
    const store = useGameStore.getState();
    store.initGame(env, [makeSlot("PEASHOOTER", 0)]);
    store.startGame();
    useGameStore.setState({ nextWaveAtMs: 500, waveConfig: oneWaveConfig(1), rngState: 1337, lawnMowers: {} });
    const result = runUntilTerminal();
    expect(result).not.toBe("timeout");
    expect(result).toBe("game-over");
  });

  it("has no impossible state at termination and Lily Pad stays on water cell", () => {
    const loadout = [makeSlot("LILY_PAD", 0), makeSlot("PEASHOOTER", 1)];
    const store = useGameStore.getState();
    store.initGame(env, loadout);
    store.startGame();
    useGameStore.setState({
      currentSun: 5000,
      nextWaveAtMs: 500,
      waveConfig: oneWaveConfig(2),
      rngState: 1337,
    });
    store.placePlant("LILY_PAD", 2, 0);
    store.placePlant("PEASHOOTER", 2, 0);
    store.placePlant("PEASHOOTER", 0, 0);
    store.placePlant("PEASHOOTER", 0, 1);
    store.placePlant("PEASHOOTER", 0, 2);
    store.placePlant("PEASHOOTER", 0, 3);
    runUntilTerminal();
    assertNoImpossibleState();

    const state = useGameStore.getState();
    for (const plant of Object.values(state.plants)) {
      if (plant.plantType === "LILY_PAD") {
        expect(state.grid[plant.row][plant.col].isWater).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// FOG
// ---------------------------------------------------------------------------

describe("FOG — end-to-end simulations", () => {
  const env: EnvironmentConfig = {
    type: "FOG",
    gridRows: GRID_ROWS_POOL,
    gridCols: GRID_COLS,
    waterLaneIndices: [2, 3],
    gravesEnabled: false,
    fogEnabled: true,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: false,
  };

  it("reaches victory with fume-shrooms in FOG vs 2 NORMAL zombies", () => {
    const loadout = [
      makeSlot("FUME_SHROOM", 0),
      makeSlot("SUN_SHROOM", 1),
    ];
    const store = useGameStore.getState();
    store.initGame(env, loadout);
    store.startGame();
    useGameStore.setState({
      currentSun: 5000,
      nextWaveAtMs: 500,
      waveConfig: oneWaveConfig(2),
      rngState: 7,
    });
    store.placePlant("FUME_SHROOM", 0, 0);
    store.placePlant("FUME_SHROOM", 0, 1);
    store.placePlant("FUME_SHROOM", 0, 2);
    store.placePlant("FUME_SHROOM", 0, 3);

    const result = runUntilTerminal();
    expect(result).not.toBe("timeout");
    expect(result).toBe("victory");
  });

  it("reaches game-over in FOG with no plants", () => {
    const store = useGameStore.getState();
    store.initGame(env, [makeSlot("FUME_SHROOM", 0)]);
    store.startGame();
    useGameStore.setState({ nextWaveAtMs: 500, waveConfig: oneWaveConfig(1), rngState: 7, lawnMowers: {} });
    const result = runUntilTerminal();
    expect(result).not.toBe("timeout");
    expect(result).toBe("game-over");
  });

  it("has no impossible state at termination", () => {
    const loadout = [makeSlot("FUME_SHROOM", 0)];
    const store = useGameStore.getState();
    store.initGame(env, loadout);
    store.startGame();
    useGameStore.setState({
      currentSun: 5000,
      nextWaveAtMs: 500,
      waveConfig: oneWaveConfig(2),
      rngState: 7,
    });
    store.placePlant("FUME_SHROOM", 0, 0);
    store.placePlant("FUME_SHROOM", 0, 1);
    store.placePlant("FUME_SHROOM", 0, 2);
    store.placePlant("FUME_SHROOM", 0, 3);
    runUntilTerminal();
    assertNoImpossibleState();
  });
});

// ---------------------------------------------------------------------------
// ROOF
// ---------------------------------------------------------------------------

describe("ROOF — end-to-end simulations", () => {
  const env: EnvironmentConfig = {
    type: "ROOF",
    gridRows: GRID_ROWS_STANDARD,
    gridCols: GRID_COLS,
    waterLaneIndices: [],
    gravesEnabled: false,
    fogEnabled: false,
    slopeEnabled: true,
    conveyorBelt: false,
    skyDropSun: true,
  };

  it("reaches victory with flower-pot + cabbage-pult vs 2 NORMAL zombies", () => {
    const loadout = [
      makeSlot("FLOWER_POT", 0),
      makeSlot("CABBAGE_PULT", 1),
    ];
    const store = useGameStore.getState();
    store.initGame(env, loadout);
    store.startGame();
    useGameStore.setState({
      currentSun: 5000,
      nextWaveAtMs: 500,
      waveConfig: oneWaveConfig(2),
      rngState: 2024,
    });
    // Place flower pots then shooters on top
    store.placePlant("FLOWER_POT", 0, 0);
    store.placePlant("CABBAGE_PULT", 0, 0);
    store.placePlant("FLOWER_POT", 0, 1);
    store.placePlant("CABBAGE_PULT", 0, 1);
    store.placePlant("FLOWER_POT", 0, 2);
    store.placePlant("CABBAGE_PULT", 0, 2);
    store.placePlant("FLOWER_POT", 0, 3);
    store.placePlant("CABBAGE_PULT", 0, 3);

    const result = runUntilTerminal();
    expect(result).not.toBe("timeout");
    expect(result).toBe("victory");
  });

  it("reaches game-over in ROOF with no plants", () => {
    const store = useGameStore.getState();
    store.initGame(env, [makeSlot("FLOWER_POT", 0)]);
    store.startGame();
    useGameStore.setState({ nextWaveAtMs: 500, waveConfig: oneWaveConfig(1), rngState: 2024, lawnMowers: {} });
    const result = runUntilTerminal();
    expect(result).not.toBe("timeout");
    expect(result).toBe("game-over");
  });

  it("has no impossible state at termination and Flower Pot stays on slope cell", () => {
    const loadout = [makeSlot("FLOWER_POT", 0), makeSlot("CABBAGE_PULT", 1)];
    const store = useGameStore.getState();
    store.initGame(env, loadout);
    store.startGame();
    useGameStore.setState({
      currentSun: 5000,
      nextWaveAtMs: 500,
      waveConfig: oneWaveConfig(2),
      rngState: 2024,
    });
    store.placePlant("FLOWER_POT", 0, 0);
    store.placePlant("CABBAGE_PULT", 0, 0);
    store.placePlant("FLOWER_POT", 0, 1);
    store.placePlant("CABBAGE_PULT", 0, 1);
    store.placePlant("FLOWER_POT", 0, 2);
    store.placePlant("CABBAGE_PULT", 0, 2);
    store.placePlant("FLOWER_POT", 0, 3);
    store.placePlant("CABBAGE_PULT", 0, 3);
    runUntilTerminal();
    assertNoImpossibleState();

    const state = useGameStore.getState();
    for (const plant of Object.values(state.plants)) {
      if (plant.plantType === "FLOWER_POT") {
        expect(state.grid[plant.row][plant.col].isSlope).toBe(true);
      }
    }
  });
});
