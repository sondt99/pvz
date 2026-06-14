import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "@/store/game-store";
import { GRID_COLS, GRID_ROWS_POOL, GRID_ROWS_STANDARD } from "@/engine/constants";
import { getPlantDef } from "@/engine/entities/plant-defs";
import type { EnvironmentConfig, EnvironmentType, SeedPacketSlot } from "@/engine/types";

const ENVIRONMENTS: Record<EnvironmentType, EnvironmentConfig> = {
  DAY: {
    type: "DAY",
    gridRows: GRID_ROWS_STANDARD,
    gridCols: GRID_COLS,
    waterLaneIndices: [],
    gravesEnabled: false,
    fogEnabled: false,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: true,
  },
  NIGHT: {
    type: "NIGHT",
    gridRows: GRID_ROWS_STANDARD,
    gridCols: GRID_COLS,
    waterLaneIndices: [],
    gravesEnabled: true,
    fogEnabled: false,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: false,
  },
  POOL: {
    type: "POOL",
    gridRows: GRID_ROWS_POOL,
    gridCols: GRID_COLS,
    waterLaneIndices: [2, 3],
    gravesEnabled: false,
    fogEnabled: false,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: true,
  },
  FOG: {
    type: "FOG",
    gridRows: GRID_ROWS_POOL,
    gridCols: GRID_COLS,
    waterLaneIndices: [2, 3],
    gravesEnabled: false,
    fogEnabled: true,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: false,
  },
  ROOF: {
    type: "ROOF",
    gridRows: GRID_ROWS_STANDARD,
    gridCols: GRID_COLS,
    waterLaneIndices: [],
    gravesEnabled: false,
    fogEnabled: false,
    slopeEnabled: true,
    conveyorBelt: false,
    skyDropSun: true,
  },
};

const LOADOUTS: Record<EnvironmentType, string[]> = {
  DAY: ["SUNFLOWER", "PEASHOOTER", "WALL_NUT", "POTATO_MINE", "SNOW_PEA", "CHOMPER", "SPIKEWEED", "CHERRY_BOMB"],
  NIGHT: ["SUN_SHROOM", "PUFF_SHROOM", "FUME_SHROOM", "WALL_NUT", "ICE_SHROOM", "CHERRY_BOMB", "COFFEE_BEAN"],
  POOL: ["SUNFLOWER", "PEASHOOTER", "LILY_PAD", "TANGLE_KELP", "WALL_NUT", "SNOW_PEA"],
  FOG: ["SUN_SHROOM", "SEA_SHROOM", "LILY_PAD", "PLANTERN", "BLOVER", "SPLIT_PEA"],
  ROOF: ["FLOWER_POT", "CABBAGE_PULT", "KERNEL_PULT", "WALL_NUT", "CHERRY_BOMB", "MELON_PULT"],
};

function makeLoadout(envType: EnvironmentType): SeedPacketSlot[] {
  return LOADOUTS[envType].map((plantType, slotIndex) => {
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
  });
}

function startRichScenario(envType: EnvironmentType) {
  const store = useGameStore.getState();
  store.initGame(ENVIRONMENTS[envType], makeLoadout(envType));
  store.startGame();
  useGameStore.setState({ currentSun: 5000, nextWaveAtMs: Number.MAX_SAFE_INTEGER });
}

function validateGridInvariants() {
  const state = useGameStore.getState();
  for (const plant of Object.values(state.plants)) {
    const cell = state.grid[plant.row]?.[plant.col];
    expect(cell, `${plant.plantType} has an in-bounds cell`).toBeDefined();
    expect(cell.graveId, `${plant.plantType} should not sit on a grave`).toBeNull();

    if (plant.plantType === "LILY_PAD") {
      expect(cell.isWater, "Lily Pad must be on water").toBe(true);
      expect(cell.lilyPadInstanceId).toBe(plant.instanceId);
      continue;
    }

    if (plant.plantType === "FLOWER_POT") {
      expect(cell.isSlope, "Flower Pot must be on roof slope").toBe(true);
      expect(cell.flowerPotInstanceId).toBe(plant.instanceId);
      continue;
    }

    const def = getPlantDef(plant.plantType);
    expect(cell.plantInstanceId).toBe(plant.instanceId);

    if (def.isAquatic) {
      expect(cell.isWater, `${plant.plantType} must stay in water`).toBe(true);
    }
    if (cell.isWater && !def.isAquatic) {
      expect(cell.lilyPadInstanceId, `${plant.plantType} needs Lily Pad on water`).not.toBeNull();
    }
    if (cell.isSlope) {
      expect(cell.flowerPotInstanceId, `${plant.plantType} needs Flower Pot on roof`).not.toBeNull();
    }
  }
}

beforeEach(() => {
  useGameStore.getState().reset();
});

describe("player-style environment scenarios", () => {
  it("plays representative DAY placements and rejects illegal aquatic land placement", () => {
    startRichScenario("DAY");

    expect(useGameStore.getState().placePlant("SUNFLOWER", 0, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("PEASHOOTER", 1, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("WALL_NUT", 2, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("POTATO_MINE", 3, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("SNOW_PEA", 4, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("CHOMPER", 0, 1)).toBe(true);
    expect(useGameStore.getState().placePlant("SPIKEWEED", 1, 1)).toBe(true);
    expect(useGameStore.getState().placePlant("CHERRY_BOMB", 2, 2)).toBe(true);
    expect(useGameStore.getState().placePlant("TANGLE_KELP", 4, 4)).toBe(false);

    validateGridInvariants();
  });

  it("plays representative NIGHT placements and blocks grave cells", () => {
    startRichScenario("NIGHT");

    const grave = useGameStore.getState().grid.flat().find((cell) => cell.graveId !== null);
    expect(grave).toBeDefined();
    expect(useGameStore.getState().placePlant("SUN_SHROOM", grave!.row, grave!.col)).toBe(false);

    expect(useGameStore.getState().placePlant("SUN_SHROOM", 0, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("PUFF_SHROOM", 1, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("FUME_SHROOM", 2, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("WALL_NUT", 3, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("ICE_SHROOM", 4, 0)).toBe(true);

    expect(Object.values(useGameStore.getState().plants).every((plant) => !plant.isSleeping)).toBe(true);
    validateGridInvariants();
  });

  it("plays representative POOL placements with Lily Pad stacking", () => {
    startRichScenario("POOL");

    expect(useGameStore.getState().placePlant("SUNFLOWER", 0, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("PEASHOOTER", 2, 0)).toBe(false);
    expect(useGameStore.getState().placePlant("LILY_PAD", 2, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("PEASHOOTER", 2, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("TANGLE_KELP", 3, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("WALL_NUT", 4, 0)).toBe(true);

    validateGridInvariants();
  });

  it("plays representative FOG placements with awake night mushrooms", () => {
    startRichScenario("FOG");

    expect(useGameStore.getState().placePlant("SUN_SHROOM", 0, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("SEA_SHROOM", 2, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("LILY_PAD", 3, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("SPLIT_PEA", 3, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("PLANTERN", 1, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("BLOVER", 4, 0)).toBe(true);

    const sunShroom = Object.values(useGameStore.getState().plants).find((plant) => plant.plantType === "SUN_SHROOM");
    expect(sunShroom?.isSleeping).toBe(false);
    validateGridInvariants();
  });

  it("plays representative ROOF placements and requires Flower Pot first", () => {
    startRichScenario("ROOF");
    const waitForFlowerPotRecharge = () => useGameStore.getState().tick(7000);

    expect(useGameStore.getState().placePlant("CABBAGE_PULT", 0, 0)).toBe(false);
    expect(useGameStore.getState().placePlant("FLOWER_POT", 0, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("CABBAGE_PULT", 0, 0)).toBe(true);
    waitForFlowerPotRecharge();
    expect(useGameStore.getState().placePlant("FLOWER_POT", 1, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("KERNEL_PULT", 1, 0)).toBe(true);
    waitForFlowerPotRecharge();
    expect(useGameStore.getState().placePlant("FLOWER_POT", 2, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("WALL_NUT", 2, 0)).toBe(true);
    waitForFlowerPotRecharge();
    expect(useGameStore.getState().placePlant("FLOWER_POT", 3, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("CHERRY_BOMB", 3, 0)).toBe(true);
    waitForFlowerPotRecharge();
    expect(useGameStore.getState().placePlant("FLOWER_POT", 4, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("MELON_PULT", 4, 0)).toBe(true);

    validateGridInvariants();
  });
});
