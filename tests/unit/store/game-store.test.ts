import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/store/game-store";
import type { EnvironmentConfig, RuntimePlant, RuntimeZombie, SeedPacketSlot } from "@/engine/types";
import {
  DIGGER_EMERGE_PAUSE_MS,
  DIGGER_EMERGE_X,
  DIGGER_EMERGED_SPEED_COLS_PER_SEC,
  DOOM_SHROOM_CRATER_MS,
  FIRE_PEA_DAMAGE_MULTIPLIER,
  GARGANTUAR_IMP_LANDING_MAX_X,
  GARGANTUAR_IMP_LANDING_MIN_X,
  GARGANTUAR_IMP_THROW_HEALTH_THRESHOLD,
  GARGANTUAR_IMP_THROW_MIN_X,
  GARGANTUAR_SMASH_RECOVERY_MS,
  POGO_WITHOUT_STICK_SPEED_COLS_PER_SEC,
  POTATO_MINE_ARM_MS,
  WAVE_INTERVAL_MS,
  ZOMBIE_SPAWN_X,
} from "@/engine/constants";
import { getZombieDef } from "@/engine/entities/zombie-defs";
import { nextRandomValue } from "@/engine/rng";

const DAY_ENV: EnvironmentConfig = {
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

const POOL_ENV: EnvironmentConfig = {
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

const FOG_ENV: EnvironmentConfig = {
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

const ROOF_ENV: EnvironmentConfig = {
  type: "ROOF",
  gridRows: 5,
  gridCols: 9,
  waterLaneIndices: [],
  gravesEnabled: false,
  fogEnabled: false,
  slopeEnabled: true,
  conveyorBelt: false,
  skyDropSun: true,
};

const LOADOUT: SeedPacketSlot[] = [
  { plantType: "PEASHOOTER", plantId: "peashooter", sunCost: 100, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 0 },
  { plantType: "SUNFLOWER",  plantId: "sunflower",  sunCost: 50,  cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 1 },
  { plantType: "WALL_NUT",   plantId: "wall-nut",   sunCost: 50,  cooldownRemainingMs: 0, cooldownTotalMs: 30000, isSelected: false, slotIndex: 2 },
];

const EXTENDED_LOADOUT: SeedPacketSlot[] = [
  { plantType: "PEASHOOTER", plantId: "peashooter", sunCost: 100, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 0 },
  { plantType: "SUNFLOWER", plantId: "sunflower", sunCost: 50, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 1 },
  { plantType: "LILY_PAD", plantId: "lily-pad", sunCost: 25, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 2 },
  { plantType: "FLOWER_POT", plantId: "flower-pot", sunCost: 25, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 3 },
  { plantType: "CABBAGE_PULT", plantId: "cabbage-pult", sunCost: 100, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 4 },
  { plantType: "CHERRY_BOMB", plantId: "cherry-bomb", sunCost: 150, cooldownRemainingMs: 0, cooldownTotalMs: 50000, isSelected: false, slotIndex: 5 },
  { plantType: "POTATO_MINE", plantId: "potato-mine", sunCost: 25, cooldownRemainingMs: 0, cooldownTotalMs: 30000, isSelected: false, slotIndex: 6 },
  { plantType: "TANGLE_KELP", plantId: "tangle-kelp", sunCost: 25, cooldownRemainingMs: 0, cooldownTotalMs: 30000, isSelected: false, slotIndex: 7 },
  { plantType: "SQUASH", plantId: "squash", sunCost: 50, cooldownRemainingMs: 0, cooldownTotalMs: 30000, isSelected: false, slotIndex: 8 },
  { plantType: "PUFF_SHROOM", plantId: "puff-shroom", sunCost: 0, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 9 },
  { plantType: "COFFEE_BEAN", plantId: "coffee-bean", sunCost: 75, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 10 },
  { plantType: "CHOMPER", plantId: "chomper", sunCost: 150, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 11 },
  { plantType: "SPIKEWEED", plantId: "spikeweed", sunCost: 100, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 12 },
  { plantType: "SEA_SHROOM", plantId: "sea-shroom", sunCost: 0, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 13 },
  { plantType: "ICE_SHROOM", plantId: "ice-shroom", sunCost: 75, cooldownRemainingMs: 0, cooldownTotalMs: 50000, isSelected: false, slotIndex: 14 },
  { plantType: "DOOM_SHROOM", plantId: "doom-shroom", sunCost: 125, cooldownRemainingMs: 0, cooldownTotalMs: 50000, isSelected: false, slotIndex: 15 },
  { plantType: "PUMPKIN", plantId: "pumpkin", sunCost: 125, cooldownRemainingMs: 0, cooldownTotalMs: 30000, isSelected: false, slotIndex: 16 },
  { plantType: "TORCHWOOD", plantId: "torchwood", sunCost: 175, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 17 },
  { plantType: "GARLIC", plantId: "garlic", sunCost: 50, cooldownRemainingMs: 0, cooldownTotalMs: 30000, isSelected: false, slotIndex: 18 },
  { plantType: "KERNEL_PULT", plantId: "kernel-pult", sunCost: 100, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 19 },
  { plantType: "STARFRUIT", plantId: "starfruit", sunCost: 125, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 20 },
  { plantType: "TALL_NUT", plantId: "tall-nut", sunCost: 125, cooldownRemainingMs: 0, cooldownTotalMs: 30000, isSelected: false, slotIndex: 21 },
  { plantType: "MAGNET_SHROOM", plantId: "magnet-shroom", sunCost: 100, cooldownRemainingMs: 0, cooldownTotalMs: 30000, isSelected: false, slotIndex: 22 },
  { plantType: "UMBRELLA_LEAF", plantId: "umbrella-leaf", sunCost: 100, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 23 },
];

function makeZombie(overrides: Partial<RuntimeZombie> = {}): RuntimeZombie {
  const def = getZombieDef(overrides.zombieType ?? "NORMAL");
  return {
    instanceId: "z1",
    zombieType: def.zombieType,
    lane: 0,
    x: ZOMBIE_SPAWN_X,
    health: def.health,
    maxHealth: def.health,
    armorHealth: def.armorHealth,
    speedColsPerSec: def.speedColsPerSec,
    eatDamagePerSec: def.eatDamagePerSec,
    isEating: false,
    eatTargetId: null,
    statusEffects: [],
    isUnderground: def.isUnderground,
    isAerial: def.isAerial,
    isFrozen: false,
    ...overrides,
  };
}

beforeEach(() => {
  useGameStore.getState().reset();
});

describe("initGame", () => {
  it("generates the correct grid size for DAY (5×9)", () => {
    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
    const { grid } = useGameStore.getState();
    expect(grid).toHaveLength(5);
    expect(grid[0]).toHaveLength(9);
  });

  it("generates the correct grid size for POOL (6×9)", () => {
    useGameStore.getState().initGame(POOL_ENV, LOADOUT);
    expect(useGameStore.getState().grid).toHaveLength(6);
  });

  it("marks water lanes correctly for POOL", () => {
    useGameStore.getState().initGame(POOL_ENV, LOADOUT);
    const { grid } = useGameStore.getState();
    expect(grid[2][0].isWater).toBe(true);
    expect(grid[3][0].isWater).toBe(true);
    expect(grid[0][0].isWater).toBe(false);
  });

  it("sets currentSun to 50", () => {
    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
    expect(useGameStore.getState().currentSun).toBe(50);
  });

  it("sets status to idle", () => {
    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
    expect(useGameStore.getState().status).toBe("idle");
  });

  it("stores the loadout", () => {
    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
    expect(useGameStore.getState().loadout).toHaveLength(3);
    expect(useGameStore.getState().loadout[0].plantType).toBe("PEASHOOTER");
  });

  it("resets wave state to initial values", () => {
    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
    const { waveNumber, nextWaveAtMs } = useGameStore.getState();
    expect(waveNumber).toBe(0);
    expect(nextWaveAtMs).toBe(WAVE_INTERVAL_MS);
  });

  it("clears any prior entities from a previous game", () => {
    // Start a game, give enough sun, place a plant, then re-init
    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 200 }); // Peashooter costs 100
    useGameStore.getState().placePlant("PEASHOOTER", 0, 0);
    expect(Object.keys(useGameStore.getState().plants)).toHaveLength(1);

    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
    expect(Object.keys(useGameStore.getState().plants)).toHaveLength(0);
  });
});

describe("startGame / pauseGame / resumeGame", () => {
  beforeEach(() => {
    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
  });

  it("startGame changes status from idle to playing", () => {
    useGameStore.getState().startGame();
    expect(useGameStore.getState().status).toBe("playing");
  });

  it("pauseGame changes status from playing to paused", () => {
    useGameStore.getState().startGame();
    useGameStore.getState().pauseGame();
    expect(useGameStore.getState().status).toBe("paused");
  });

  it("resumeGame changes status from paused to playing", () => {
    useGameStore.getState().startGame();
    useGameStore.getState().pauseGame();
    useGameStore.getState().resumeGame();
    expect(useGameStore.getState().status).toBe("playing");
  });

  it("resumeGame does nothing if already playing", () => {
    useGameStore.getState().startGame();
    useGameStore.getState().resumeGame(); // no-op
    expect(useGameStore.getState().status).toBe("playing");
  });
});

describe("placePlant", () => {
  beforeEach(() => {
    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
    useGameStore.getState().startGame();
  });

  it("places a Peashooter (100 sun) when store has 200 sun", () => {
    useGameStore.setState({ currentSun: 200 });
    const ok = useGameStore.getState().placePlant("PEASHOOTER", 0, 0);
    expect(ok).toBe(true);
    expect(useGameStore.getState().currentSun).toBe(100);
    const plants = Object.values(useGameStore.getState().plants);
    expect(plants).toHaveLength(1);
    expect(plants[0].plantType).toBe("PEASHOOTER");
  });

  it("returns false if insufficient sun", () => {
    // Default 50 sun; Peashooter costs 100 → not enough
    const ok = useGameStore.getState().placePlant("PEASHOOTER", 0, 0);
    expect(ok).toBe(false);
    expect(useGameStore.getState().currentSun).toBe(50); // unchanged
  });

  it("places a Sunflower (costs 50) with exactly 50 sun", () => {
    const ok = useGameStore.getState().placePlant("SUNFLOWER", 0, 0);
    expect(ok).toBe(true);
    expect(useGameStore.getState().currentSun).toBe(0);
  });

  it("places the plant instanceId on the grid cell", () => {
    useGameStore.getState().placePlant("SUNFLOWER", 1, 2);
    const cell = useGameStore.getState().grid[1][2];
    expect(cell.plantInstanceId).not.toBeNull();
  });

  it("adds the plant to the plants record", () => {
    useGameStore.getState().placePlant("SUNFLOWER", 0, 3);
    const plants = useGameStore.getState().plants;
    expect(Object.keys(plants)).toHaveLength(1);
    const plant = Object.values(plants)[0];
    expect(plant.plantType).toBe("SUNFLOWER");
    expect(plant.row).toBe(0);
    expect(plant.col).toBe(3);
  });

  it("rejects placing on an occupied cell", () => {
    useGameStore.getState().placePlant("SUNFLOWER", 0, 0);
    const ok2 = useGameStore.getState().placePlant("SUNFLOWER", 0, 0);
    expect(ok2).toBe(false);
    expect(Object.keys(useGameStore.getState().plants)).toHaveLength(1);
  });

  it("returns false while status is not playing", () => {
    useGameStore.getState().pauseGame();
    const ok = useGameStore.getState().placePlant("SUNFLOWER", 0, 0);
    expect(ok).toBe(false);
  });

  it("returns false for an unknown plant type", () => {
    const ok = useGameStore.getState().placePlant("BANANA_TREE", 0, 0);
    expect(ok).toBe(false);
  });

  it("rejects aquatic plants on land", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("TANGLE_KELP", 0, 0)).toBe(false);
    expect(useGameStore.getState().placePlant("SEA_SHROOM", 0, 0)).toBe(false);
    expect(Object.keys(useGameStore.getState().plants)).toHaveLength(0);
    expect(useGameStore.getState().currentSun).toBe(500);
  });

  it("puts Lily Pad in the water platform slot, then stacks Peashooter above it", () => {
    useGameStore.getState().initGame(POOL_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("LILY_PAD", 2, 0)).toBe(true);
    let cell = useGameStore.getState().grid[2][0];
    expect(cell.lilyPadInstanceId).not.toBeNull();
    expect(cell.plantInstanceId).toBeNull();

    expect(useGameStore.getState().placePlant("PEASHOOTER", 2, 0)).toBe(true);
    cell = useGameStore.getState().grid[2][0];
    expect(cell.lilyPadInstanceId).not.toBeNull();
    expect(cell.plantInstanceId).not.toBeNull();
    expect(Object.values(useGameStore.getState().plants).map((p) => p.plantType)).toEqual(
      expect.arrayContaining(["LILY_PAD", "PEASHOOTER"])
    );
  });

  it("rejects Flower Pot on a Lily Pad water cell", () => {
    useGameStore.getState().initGame(POOL_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("LILY_PAD", 2, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("FLOWER_POT", 2, 0)).toBe(false);
    expect(useGameStore.getState().grid[2][0].flowerPotInstanceId).toBeNull();
    expect(Object.values(useGameStore.getState().plants).map((plant) => plant.plantType)).toEqual(["LILY_PAD"]);
  });

  it("makes zombies eat the top plant before the Lily Pad platform underneath", () => {
    useGameStore.getState().initGame(POOL_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("LILY_PAD", 2, 3)).toBe(true);
    expect(useGameStore.getState().placePlant("PEASHOOTER", 2, 3)).toBe(true);

    const peashooter = Object.values(useGameStore.getState().plants).find(
      (plant) => plant.plantType === "PEASHOOTER"
    );
    const lilyPad = Object.values(useGameStore.getState().plants).find(
      (plant) => plant.plantType === "LILY_PAD"
    );
    expect(peashooter).toBeDefined();
    expect(lilyPad).toBeDefined();

    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 2, x: 3.2 }),
      },
    });
    useGameStore.getState().tick(0);

    expect(useGameStore.getState().zombies.z1.eatTargetId).toBe(peashooter!.instanceId);
    expect(useGameStore.getState().zombies.z1.eatTargetId).not.toBe(lilyPad!.instanceId);
  });

  it("stacks Pumpkin armor over an existing plant without replacing the plant slot", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("PEASHOOTER", 0, 0)).toBe(true);
    const peashooterId = useGameStore.getState().grid[0][0].plantInstanceId;
    expect(peashooterId).not.toBeNull();

    expect(useGameStore.getState().placePlant("PUMPKIN", 0, 0)).toBe(true);
    const cell = useGameStore.getState().grid[0][0];
    expect(cell.plantInstanceId).toBe(peashooterId);
    expect(cell.pumpkinInstanceId).not.toBeNull();
    expect(Object.values(useGameStore.getState().plants).map((plant) => plant.plantType)).toEqual(
      expect.arrayContaining(["PEASHOOTER", "PUMPKIN"])
    );

    useGameStore.setState((state) => ({
      loadout: state.loadout.map((slot) =>
        slot.plantType === "PUMPKIN" ? { ...slot, cooldownRemainingMs: 0 } : slot
      ),
    }));
    expect(useGameStore.getState().placePlant("PUMPKIN", 0, 0)).toBe(false);
  });

  it("makes zombies eat Pumpkin before the protected plant", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("PEASHOOTER", 0, 3)).toBe(true);
    expect(useGameStore.getState().placePlant("PUMPKIN", 0, 3)).toBe(true);

    const peashooter = Object.values(useGameStore.getState().plants).find(
      (plant) => plant.plantType === "PEASHOOTER"
    );
    const pumpkin = Object.values(useGameStore.getState().plants).find(
      (plant) => plant.plantType === "PUMPKIN"
    );
    expect(peashooter).toBeDefined();
    expect(pumpkin).toBeDefined();

    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 3.2 }),
      },
    });
    useGameStore.getState().tick(0);

    expect(useGameStore.getState().zombies.z1.eatTargetId).toBe(pumpkin!.instanceId);
    expect(useGameStore.getState().zombies.z1.eatTargetId).not.toBe(peashooter!.instanceId);

    useGameStore.setState((state) => ({
      plants: {
        ...state.plants,
        [pumpkin!.instanceId]: { ...state.plants[pumpkin!.instanceId], health: 1 },
      },
    }));
    useGameStore.getState().tick(100);

    expect(useGameStore.getState().plants[pumpkin!.instanceId]).toBeUndefined();
    expect(useGameStore.getState().plants[peashooter!.instanceId]).toBeDefined();
    expect(useGameStore.getState().grid[0][3].pumpkinInstanceId).toBeNull();
    expect(useGameStore.getState().grid[0][3].plantInstanceId).toBe(peashooter!.instanceId);
  });

  it("redirects top-lane zombies downward when they bite Garlic", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("GARLIC", 0, 3)).toBe(true);
    const garlic = Object.values(useGameStore.getState().plants).find(
      (plant) => plant.plantType === "GARLIC"
    );
    expect(garlic).toBeDefined();

    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 3.2 }),
      },
    });
    useGameStore.getState().tick(0);
    useGameStore.getState().tick(100);

    expect(useGameStore.getState().zombies.z1.lane).toBe(1);
    expect(useGameStore.getState().zombies.z1.isEating).toBe(false);
    expect(useGameStore.getState().plants[garlic!.instanceId].health).toBeLessThan(garlic!.health);
  });

  it("redirects middle-lane zombies to an adjacent Garlic lane", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("GARLIC", 2, 3)).toBe(true);
    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 2, x: 3.2 }),
      },
    });
    useGameStore.getState().tick(0);
    useGameStore.getState().tick(100);

    expect([1, 3]).toContain(useGameStore.getState().zombies.z1.lane);
    expect(useGameStore.getState().zombies.z1.isEating).toBe(false);
  });

  it("redirects bottom-lane zombies upward when they bite Garlic", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("GARLIC", 4, 3)).toBe(true);
    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 4, x: 3.2 }),
      },
    });
    useGameStore.getState().tick(0);
    useGameStore.getState().tick(100);

    expect(useGameStore.getState().zombies.z1.lane).toBe(3);
    expect(useGameStore.getState().zombies.z1.isEating).toBe(false);
  });

  it("rejects planting on visible Night graves", () => {
    const nightEnv: EnvironmentConfig = { ...DAY_ENV, type: "NIGHT", gravesEnabled: true, skyDropSun: false };
    useGameStore.getState().initGame(nightEnv, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    const graveCell = useGameStore.getState().grid.flat().find((cell) => cell.graveId !== null);
    expect(graveCell).toBeDefined();
    expect(useGameStore.getState().placePlant("SUNFLOWER", graveCell!.row, graveCell!.col)).toBe(false);
  });

  it("spawns grave ambush zombies from grave columns on every fifth wave", () => {
    const nightEnv: EnvironmentConfig = { ...DAY_ENV, type: "NIGHT", gravesEnabled: true, skyDropSun: false };
    useGameStore.getState().initGame(nightEnv, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    const graveXs = useGameStore.getState().grid
      .flat()
      .filter((cell) => cell.graveId !== null)
      .map((cell) => cell.col);
    useGameStore.setState({
      waveNumber: 4,
      nextWaveAtMs: 100,
      zombieSpawnQueue: [],
    });

    useGameStore.getState().tick(100);
    const zombies = Object.values(useGameStore.getState().zombies);
    expect(zombies.some((zombie) => graveXs.some((graveX) => Math.abs(zombie.x - graveX) < 0.1))).toBe(true);
  });

  it("puts Flower Pot in the roof platform slot, then stacks a lobber above it", () => {
    useGameStore.getState().initGame(ROOF_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("FLOWER_POT", 0, 0)).toBe(true);
    let cell = useGameStore.getState().grid[0][0];
    expect(cell.flowerPotInstanceId).not.toBeNull();
    expect(cell.plantInstanceId).toBeNull();

    expect(useGameStore.getState().placePlant("CABBAGE_PULT", 0, 0)).toBe(true);
    cell = useGameStore.getState().grid[0][0];
    expect(cell.flowerPotInstanceId).not.toBeNull();
    expect(cell.plantInstanceId).not.toBeNull();
  });

  it("blocks a seed packet while its recharge cooldown is active", () => {
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("SUNFLOWER", 0, 0)).toBe(true);
    expect(useGameStore.getState().loadout[1].cooldownRemainingMs).toBe(7000);
    expect(useGameStore.getState().placePlant("SUNFLOWER", 0, 1)).toBe(false);

    useGameStore.getState().tick(7000);
    expect(useGameStore.getState().loadout[1].cooldownRemainingMs).toBe(0);
    expect(useGameStore.getState().placePlant("SUNFLOWER", 0, 1)).toBe(true);
  });

  it("lets Coffee Bean wake a sleeping daytime mushroom without occupying the cell", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("PUFF_SHROOM", 0, 0)).toBe(true);
    const mushroom = Object.values(useGameStore.getState().plants)[0];
    expect(mushroom.isSleeping).toBe(true);

    expect(useGameStore.getState().placePlant("COFFEE_BEAN", 0, 0)).toBe(true);
    expect(useGameStore.getState().plants[mushroom.instanceId].isSleeping).toBe(false);
    expect(useGameStore.getState().grid[0][0].plantInstanceId).toBe(mushroom.instanceId);
    expect(Object.values(useGameStore.getState().plants).map((plant) => plant.plantType)).toEqual(["PUFF_SHROOM"]);
  });

  it("rejects Coffee Bean on an empty cell without spending sun", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("COFFEE_BEAN", 0, 0)).toBe(false);
    expect(useGameStore.getState().currentSun).toBe(500);
  });

  it("keeps mushrooms awake in Fog because it is a night-style environment", () => {
    useGameStore.getState().initGame(FOG_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("PUFF_SHROOM", 0, 0)).toBe(true);
    const mushroom = Object.values(useGameStore.getState().plants)[0];
    expect(mushroom.isSleeping).toBe(false);
  });

  it("plants instant mushrooms asleep in day-like environments until Coffee Bean triggers them", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({
      currentSun: 500,
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 4 }),
      },
    });

    expect(useGameStore.getState().placePlant("ICE_SHROOM", 0, 0)).toBe(true);

    const sleepingIce = Object.values(useGameStore.getState().plants)[0];
    expect(sleepingIce.plantType).toBe("ICE_SHROOM");
    expect(sleepingIce.isSleeping).toBe(true);
    expect(useGameStore.getState().zombies.z1.isFrozen).toBe(false);

    expect(useGameStore.getState().placePlant("COFFEE_BEAN", 0, 0)).toBe(true);
    expect(Object.keys(useGameStore.getState().plants)).toHaveLength(0);
    expect(useGameStore.getState().grid[0][0].plantInstanceId).toBeNull();
    expect(useGameStore.getState().zombies.z1.isFrozen).toBe(true);
    expect(useGameStore.getState().currentSun).toBe(350);
  });

  it("fires instant mushrooms immediately in Fog because it is night-style", () => {
    useGameStore.getState().initGame(FOG_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({
      currentSun: 500,
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 4 }),
      },
    });

    expect(useGameStore.getState().placePlant("ICE_SHROOM", 0, 0)).toBe(true);
    expect(Object.keys(useGameStore.getState().plants)).toHaveLength(0);
    expect(useGameStore.getState().grid[0][0].plantInstanceId).toBeNull();
    expect(useGameStore.getState().zombies.z1.isFrozen).toBe(true);
  });

  it("uses Doom-shroom immediately at night and leaves a temporary crater", () => {
    const nightEnv: EnvironmentConfig = { ...DAY_ENV, type: "NIGHT", skyDropSun: false };
    useGameStore.getState().initGame(nightEnv, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({
      currentSun: 500,
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 2, x: 3 }),
        z2: makeZombie({ instanceId: "z2", lane: 4, x: 6.4 }),
        z3: makeZombie({ instanceId: "z3", lane: 0, x: 7 }),
      },
    });

    expect(useGameStore.getState().placePlant("DOOM_SHROOM", 2, 3)).toBe(true);

    expect(Object.keys(useGameStore.getState().plants)).toHaveLength(0);
    expect(Object.keys(useGameStore.getState().zombies)).toEqual(["z3"]);
    expect(useGameStore.getState().score).toBe(200);
    expect(useGameStore.getState().totalZombiesKilled).toBe(2);
    expect(useGameStore.getState().grid[2][3].craterExpiresAtMs).toBe(DOOM_SHROOM_CRATER_MS);

    const sunAfterDoom = useGameStore.getState().currentSun;
    expect(useGameStore.getState().placePlant("PEASHOOTER", 2, 3)).toBe(false);
    expect(useGameStore.getState().currentSun).toBe(sunAfterDoom);
  });

  it("clears a 5x7 fog area around Plantern", () => {
    useGameStore.getState().initGame(FOG_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().grid[1][5].isFog).toBe(true);
    expect(useGameStore.getState().placePlant("PLANTERN", 1, 5)).toBe(true);

    expect(useGameStore.getState().grid[1][5].isFog).toBe(false);
    expect(useGameStore.getState().grid[0][8].isFog).toBe(false);
    expect(useGameStore.getState().grid[5][8].isFog).toBe(true);
  });

  it("lets Blover clear all fog and blow away Balloon zombies", () => {
    useGameStore.getState().initGame(FOG_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({
      currentSun: 500,
      zombies: {
        z1: makeZombie({ instanceId: "z1", zombieType: "BALLOON", lane: 0, x: 7, isAerial: true }),
        z2: makeZombie({ instanceId: "z2", lane: 1, x: 7 }),
      },
    });

    expect(useGameStore.getState().grid.flat().some((cell) => cell.isFog)).toBe(true);
    expect(useGameStore.getState().placePlant("BLOVER", 0, 0)).toBe(true);
    expect(useGameStore.getState().grid.flat().some((cell) => cell.isFog)).toBe(false);
    expect(Object.keys(useGameStore.getState().zombies)).toEqual(["z2"]);
  });

  it("applies Cherry Bomb as an immediate 3x3 blast without leaving a plant behind", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({
      currentSun: 500,
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 1, x: 3 }),
        z2: makeZombie({ instanceId: "z2", lane: 2, x: 4.4 }),
        z3: makeZombie({ instanceId: "z3", lane: 4, x: 3 }),
      },
    });

    expect(useGameStore.getState().placePlant("CHERRY_BOMB", 1, 3)).toBe(true);
    expect(useGameStore.getState().grid[1][3].plantInstanceId).toBeNull();
    expect(Object.keys(useGameStore.getState().plants)).toHaveLength(0);
    expect(Object.keys(useGameStore.getState().zombies)).toEqual(["z3"]);
    expect(useGameStore.getState().score).toBe(200);
    expect(useGameStore.getState().totalZombiesKilled).toBe(2);
  });

  it("arms Potato Mine after its canonical delay, then spends itself on contact", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("POTATO_MINE", 0, 3)).toBe(true);
    const mineId = Object.keys(useGameStore.getState().plants)[0];
    expect(useGameStore.getState().plants[mineId].isCharging).toBe(true);

    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 3.2 }),
      },
    });

    useGameStore.getState().tick(POTATO_MINE_ARM_MS - 1);
    expect(useGameStore.getState().plants[mineId]).toBeDefined();
    expect(useGameStore.getState().zombies.z1).toBeDefined();

    useGameStore.getState().tick(1);
    expect(useGameStore.getState().plants[mineId]).toBeUndefined();
    expect(useGameStore.getState().grid[0][3].plantInstanceId).toBeNull();
    expect(useGameStore.getState().zombies.z1).toBeUndefined();
    expect(useGameStore.getState().score).toBe(100);
  });

  it("keeps Tangle Kelp planted until a water-lane zombie reaches it", () => {
    useGameStore.getState().initGame(POOL_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("TANGLE_KELP", 2, 3)).toBe(true);
    const kelpId = Object.keys(useGameStore.getState().plants)[0];
    expect(useGameStore.getState().grid[2][3].plantInstanceId).toBe(kelpId);

    useGameStore.getState().tick(1000);
    expect(useGameStore.getState().plants[kelpId]).toBeDefined();

    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 2, x: 3.1 }),
      },
    });
    useGameStore.getState().tick(0);

    expect(useGameStore.getState().plants[kelpId]).toBeUndefined();
    expect(useGameStore.getState().grid[2][3].plantInstanceId).toBeNull();
    expect(useGameStore.getState().zombies.z1).toBeUndefined();
  });

  it("treats Squash as a planted contact-trigger plant instead of an instant click effect", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500 });

    expect(useGameStore.getState().placePlant("SQUASH", 0, 3)).toBe(true);
    const squashId = Object.keys(useGameStore.getState().plants)[0];
    expect(useGameStore.getState().plants[squashId]).toBeDefined();

    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 4.1 }),
      },
    });
    useGameStore.getState().tick(0);

    expect(useGameStore.getState().plants[squashId]).toBeUndefined();
    expect(useGameStore.getState().zombies.z1).toBeUndefined();
  });

  it("makes Chomper eat a nearby zombie and then chew before acting again", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("CHOMPER", 0, 3)).toBe(true);
    const chomperId = Object.keys(useGameStore.getState().plants)[0];

    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 4.1 }),
      },
    });
    useGameStore.getState().tick(0);

    expect(useGameStore.getState().zombies.z1).toBeUndefined();
    expect(useGameStore.getState().plants[chomperId]).toMatchObject({ isCharging: true });
    expect(useGameStore.getState().score).toBe(100);

    useGameStore.getState().tick(42_000);
    expect(useGameStore.getState().plants[chomperId].isCharging).toBe(false);
  });

  it("lets Spikeweed damage zombies that walk over it without being eaten", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("SPIKEWEED", 0, 3)).toBe(true);
    const spikeweedId = Object.keys(useGameStore.getState().plants)[0];

    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 3.1 }),
      },
    });
    useGameStore.getState().tick(0);
    expect(useGameStore.getState().zombies.z1.isEating).toBe(false);
    expect(useGameStore.getState().zombies.z1.eatTargetId).toBeNull();

    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 3.1, health: 20, maxHealth: 20 }),
      },
    });
    useGameStore.getState().tick(1000);

    expect(useGameStore.getState().zombies.z1).toBeUndefined();
    expect(useGameStore.getState().plants[spikeweedId]).toBeDefined();
    expect(useGameStore.getState().grid[0][3].plantInstanceId).toBe(spikeweedId);
  });

  it("fires two projectiles for Repeater in a real tick", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("REPEATER", 0, 1)).toBe(true);
    useGameStore.setState({
      gameTimeMs: 1400,
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 7 }),
      },
    });

    useGameStore.getState().tick(100);
    expect(Object.values(useGameStore.getState().projectiles)).toHaveLength(2);
  });

  it("blocks Peashooter shots from the four leftmost Roof columns", () => {
    useGameStore.getState().initGame(ROOF_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 1000, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("FLOWER_POT", 0, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("PEASHOOTER", 0, 0)).toBe(true);
    useGameStore.setState({
      gameTimeMs: 5000,
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 7, speedColsPerSec: 0 }),
      },
    });

    useGameStore.getState().tick(1);
    expect(Object.values(useGameStore.getState().projectiles)).toHaveLength(0);

    useGameStore.getState().tick(2000);
    expect(useGameStore.getState().zombies.z1.health).toBe(200);
  });

  it("lets Cabbage-pult lob over the Roof slope from the leftmost columns", () => {
    useGameStore.getState().initGame(ROOF_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 1000, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("FLOWER_POT", 0, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("CABBAGE_PULT", 0, 0)).toBe(true);
    useGameStore.setState({
      gameTimeMs: 5000,
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 7, speedColsPerSec: 0 }),
      },
    });

    useGameStore.getState().tick(1);
    const projectile = Object.values(useGameStore.getState().projectiles)[0];
    expect(projectile).toMatchObject({
      trajectory: "lobbed",
      targetCol: 7,
    });

    useGameStore.getState().tick(2000);
    expect(useGameStore.getState().zombies.z1.health).toBe(160);
  });

  it("uses deterministic RNG for Kernel-pult butter and applies BUTTERED on hit", () => {
    const butterSeed = 1;
    const expectedNextRng = nextRandomValue(butterSeed).rngState;

    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({
      currentSun: 500,
      nextWaveAtMs: Number.MAX_SAFE_INTEGER,
      rngState: butterSeed,
    });

    expect(useGameStore.getState().placePlant("KERNEL_PULT", 0, 0)).toBe(true);
    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 7, health: 200, maxHealth: 200, armorHealth: 0 }),
      },
    });

    useGameStore.getState().tick(2999);
    expect(Object.values(useGameStore.getState().projectiles)).toHaveLength(0);

    useGameStore.getState().tick(1);
    const projectile = Object.values(useGameStore.getState().projectiles)[0];
    expect(projectile.projectileType).toBe("BUTTER");
    expect(projectile.damage).toBe(40);
    expect(useGameStore.getState().rngState).toBe(expectedNextRng);

    useGameStore.getState().tick(2000);
    const zombie = useGameStore.getState().zombies.z1;
    expect(zombie.health).toBe(160);
    expect(zombie.statusEffects).toContainEqual({
      type: "BUTTERED",
      expiresAtMs: 10_000,
    });
  });

  it("fires Threepeater projectiles into the covered lanes", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("THREEPEATER", 2, 1)).toBe(true);
    useGameStore.setState({
      gameTimeMs: 1400,
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 1, x: 7 }),
      },
    });

    useGameStore.getState().tick(100);
    expect(Object.values(useGameStore.getState().projectiles).map((projectile) => projectile.lane)).toEqual([1, 2, 3]);
  });

  it("fires Starfruit stars in five directions and hits diagonal zombies", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("STARFRUIT", 2, 2)).toBe(true);
    useGameStore.setState({
      gameTimeMs: 1499,
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 1, x: 4.5, health: 200, maxHealth: 200, armorHealth: 0 }),
      },
    });

    expect(Object.values(useGameStore.getState().projectiles)).toHaveLength(0);

    useGameStore.getState().tick(1);
    const projectiles = Object.values(useGameStore.getState().projectiles);
    expect(projectiles).toHaveLength(5);
    expect(projectiles.map((projectile) => [projectile.velX, projectile.velLane ?? 0])).toEqual([
      [-8, 0],
      [0, -8],
      [0, 8],
      [8, -4],
      [8, 4],
    ]);

    useGameStore.getState().tick(250);
    expect(useGameStore.getState().zombies.z1.health).toBe(180);
  });

  it("fires Split Pea rear projectiles backward when a zombie is behind it", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("SPLIT_PEA", 0, 3)).toBe(true);
    useGameStore.setState({
      gameTimeMs: 1400,
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 0.5 }),
      },
    });

    useGameStore.getState().tick(100);
    const projectiles = Object.values(useGameStore.getState().projectiles);
    expect(projectiles).toHaveLength(2);
    expect(projectiles.every((projectile) => projectile.velX < 0)).toBe(true);
  });

  it("turns Peashooter peas into fire peas after crossing Torchwood", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 1_000, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("PEASHOOTER", 0, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("TORCHWOOD", 0, 2)).toBe(true);
    useGameStore.setState({
      gameTimeMs: 1400,
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 7 }),
      },
    });

    useGameStore.getState().tick(100);
    useGameStore.getState().tick(100);

    const projectile = Object.values(useGameStore.getState().projectiles)[0];
    expect(projectile.projectileType).toBe("FIRE_PEA");
    expect(projectile.damage).toBe(20 * FIRE_PEA_DAMAGE_MULTIPLIER);
    expect(projectile.isFire).toBe(true);
  });

  it("melts Snow Pea projectiles into regular peas after crossing Torchwood", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 1_000, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("SNOW_PEA", 0, 0)).toBe(true);
    expect(useGameStore.getState().placePlant("TORCHWOOD", 0, 2)).toBe(true);
    useGameStore.setState({
      gameTimeMs: 1400,
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 7 }),
      },
    });

    useGameStore.getState().tick(100);
    useGameStore.getState().tick(100);

    const projectile = Object.values(useGameStore.getState().projectiles)[0];
    expect(projectile.projectileType).toBe("PEA");
    expect(projectile.damage).toBe(20);
    expect(projectile.slowFactor).toBeUndefined();
    expect(projectile.isFire).toBeUndefined();
  });

  it("does not let Peashooter fire at Balloon, while Cactus does", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("PEASHOOTER", 0, 1)).toBe(true);
    useGameStore.setState({
      gameTimeMs: 1400,
      zombies: {
        z1: makeZombie({ instanceId: "z1", zombieType: "BALLOON", lane: 0, x: 7, isAerial: true }),
      },
    });
    useGameStore.getState().tick(100);
    expect(Object.values(useGameStore.getState().projectiles)).toHaveLength(0);

    useGameStore.getState().reset();
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER, gameTimeMs: 1400 });
    expect(useGameStore.getState().placePlant("CACTUS", 0, 1)).toBe(true);
    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", zombieType: "BALLOON", lane: 0, x: 7, isAerial: true }),
      },
    });
    useGameStore.getState().tick(100);
    expect(Object.values(useGameStore.getState().projectiles)).toHaveLength(1);
    expect(Object.values(useGameStore.getState().projectiles)[0].canHitAerial).toBe(true);
  });
});

describe("removePlant", () => {
  beforeEach(() => {
    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
    useGameStore.getState().startGame();
  });

  it("removes the plant and clears the grid cell", () => {
    useGameStore.getState().placePlant("SUNFLOWER", 0, 0);
    const id = Object.keys(useGameStore.getState().plants)[0];
    useGameStore.getState().removePlant(id);
    expect(useGameStore.getState().plants[id]).toBeUndefined();
    expect(useGameStore.getState().grid[0][0].plantInstanceId).toBeNull();
  });

  it("is a no-op for a non-existent instanceId", () => {
    expect(() => useGameStore.getState().removePlant("ghost-id")).not.toThrow();
  });
});

describe("collectSunDrop", () => {
  beforeEach(() => {
    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
    useGameStore.getState().startGame();
  });

  it("adds sun and removes the drop from sunDrops", () => {
    // Inject a drop directly via the store state
    useGameStore.setState((s) => ({
      sunDrops: {
        "test-drop": {
          instanceId: "test-drop",
          x: 4.5, y: 2, targetY: 2,
          value: 25, source: "sky" as const,
          state: "landed" as const,
          spawnedAtMs: 0, lifetimeMs: 9000,
        },
      },
    }));

    useGameStore.getState().collectSunDrop("test-drop");
    expect(useGameStore.getState().currentSun).toBe(75); // 50 + 25
    expect(useGameStore.getState().sunDrops["test-drop"]).toBeUndefined();
  });

  it("increments cumulativeSun", () => {
    useGameStore.setState((s) => ({
      sunDrops: {
        "d1": { instanceId: "d1", x: 0, y: 0, targetY: 0, value: 25, source: "sky" as const, state: "landed" as const, spawnedAtMs: 0, lifetimeMs: 9000 },
      },
    }));
    useGameStore.getState().collectSunDrop("d1");
    expect(useGameStore.getState().cumulativeSun).toBe(25);
  });

  it("is a no-op for an already-collected drop", () => {
    useGameStore.setState((s) => ({
      sunDrops: {
        "d1": { instanceId: "d1", x: 0, y: 0, targetY: 0, value: 25, source: "sky" as const, state: "collected" as const, spawnedAtMs: 0, lifetimeMs: 9000 },
      },
    }));
    useGameStore.getState().collectSunDrop("d1");
    expect(useGameStore.getState().currentSun).toBe(50); // unchanged
  });
});

describe("tick — zombie movement", () => {
  beforeEach(() => {
    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
    useGameStore.getState().startGame();
  });

  it("advances gameTimeMs by deltaMs", () => {
    useGameStore.getState().tick(100);
    expect(useGameStore.getState().gameTimeMs).toBe(100);
  });

  it("moves zombies left by speed * delta", () => {
    useGameStore.getState().queueZombie("NORMAL", 0, 0); // spawn immediately
    useGameStore.getState().tick(0); // spawn the zombie
    const before = useGameStore.getState().zombies;
    const id = Object.keys(before)[0];
    expect(before[id].x).toBe(ZOMBIE_SPAWN_X);

    const normalSpeed = getZombieDef("NORMAL").speedColsPerSec;
    useGameStore.getState().tick(1000);
    const after = useGameStore.getState().zombies[id];
    expect(after.x).toBeCloseTo(ZOMBIE_SPAWN_X - normalSpeed, 5);
  });

  it("does not tick when paused", () => {
    useGameStore.getState().pauseGame();
    useGameStore.getState().tick(1000);
    expect(useGameStore.getState().gameTimeMs).toBe(0);
  });

  it("spawns queued zombies when their spawnAtMs is reached", () => {
    useGameStore.getState().queueZombie("CONEHEAD", 2, 5000);
    useGameStore.getState().tick(5001);
    const zombies = Object.values(useGameStore.getState().zombies);
    expect(zombies).toHaveLength(1);
    expect(zombies[0].zombieType).toBe("CONEHEAD");
    expect(zombies[0].lane).toBe(2);
  });

  it("uses configured deterministic level waves when provided", () => {
    const waveConfig = {
      finalWaveNumber: 1,
      waves: [
        {
          waveNumber: 1,
          entries: [
            { zombieType: "BUCKETHEAD", lane: 4, spawnAtMs: 0 },
            { zombieType: "CONEHEAD", lane: 1, spawnAtMs: 500 },
          ],
          final: true,
        },
      ],
    };
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT, {
      rngSeed: "configured-store-wave",
      waveConfig,
    });
    useGameStore.getState().startGame();

    useGameStore.getState().tick(WAVE_INTERVAL_MS);

    const zombies = Object.values(useGameStore.getState().zombies);
    expect(zombies).toHaveLength(1);
    expect(zombies[0]).toMatchObject({ zombieType: "BUCKETHEAD", lane: 4 });
    expect(useGameStore.getState().zombieSpawnQueue).toEqual([
      { zombieType: "CONEHEAD", lane: 1, spawnAtMs: WAVE_INTERVAL_MS + 500 },
      expect.objectContaining({ zombieType: "FLAG", spawnAtMs: WAVE_INTERVAL_MS + 1000 }),
    ]);
    expect(useGameStore.getState().waveNumber).toBe(1);
  });

  it("routes aquatic zombies to Pool water lanes when queued on land", () => {
    useGameStore.getState().initGame(POOL_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();

    useGameStore.getState().queueZombie("DUCKY_TUBE", 0, 0);
    useGameStore.getState().queueZombie("SNORKEL", 1, 0);
    useGameStore.getState().queueZombie("DOLPHIN_RIDER", 4, 0);
    useGameStore.getState().tick(0);

    const zombies = Object.values(useGameStore.getState().zombies);
    expect(zombies).toHaveLength(3);
    expect(zombies.every((zombie) => POOL_ENV.waterLaneIndices.includes(zombie.lane))).toBe(true);
    expect(zombies.find((zombie) => zombie.zombieType === "SNORKEL")?.isSubmerged).toBe(true);
  });

  it("surfaces Snorkel zombies when they start eating a pool plant", () => {
    useGameStore.getState().initGame(POOL_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("LILY_PAD", 2, 3)).toBe(true);
    expect(useGameStore.getState().placePlant("WALL_NUT", 2, 3)).toBe(true);
    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", zombieType: "SNORKEL", lane: 2, x: 3.2, isSubmerged: true }),
      },
    });

    useGameStore.getState().tick(0);
    expect(useGameStore.getState().zombies.z1.isEating).toBe(true);
    expect(useGameStore.getState().zombies.z1.isSubmerged).toBe(false);
  });

  it("lets Dolphin Rider jump over the first pool plant and slow down afterward", () => {
    useGameStore.getState().initGame(POOL_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("LILY_PAD", 2, 3)).toBe(true);
    expect(useGameStore.getState().placePlant("WALL_NUT", 2, 3)).toBe(true);
    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", zombieType: "DOLPHIN_RIDER", lane: 2, x: 3.2, hasJumped: false }),
      },
    });

    useGameStore.getState().tick(0);
    const zombie = useGameStore.getState().zombies.z1;
    expect(zombie.isEating).toBe(false);
    expect(zombie.hasJumped).toBe(true);
    expect(zombie.x).toBeLessThan(3);
    expect(zombie.speedColsPerSec).toBeCloseTo(getZombieDef("NORMAL").speedColsPerSec);
  });

  it("prevents Dolphin Rider from jumping over Tall-nut", () => {
    useGameStore.getState().initGame(POOL_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("LILY_PAD", 2, 3)).toBe(true);
    expect(useGameStore.getState().placePlant("TALL_NUT", 2, 3)).toBe(true);
    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", zombieType: "DOLPHIN_RIDER", lane: 2, x: 3.2, hasJumped: false }),
      },
    });

    useGameStore.getState().tick(0);
    const zombie = useGameStore.getState().zombies.z1;
    expect(zombie.isEating).toBe(true);
    expect(zombie.hasJumped).toBe(false);
    expect(zombie.x).toBe(3.2);
  });

  it("lets Digger surface behind defenses before attacking from the left side", () => {
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });
    expect(useGameStore.getState().placePlant("PEASHOOTER", 0, 0)).toBe(true);
    useGameStore.setState({
      zombies: {
        z1: makeZombie({
          instanceId: "z1",
          zombieType: "DIGGER",
          lane: 0,
          x: -0.6,
          isUnderground: true,
          direction: "left",
        }),
      },
    });

    useGameStore.getState().tick(0);
    let state = useGameStore.getState();
    expect(state.status).toBe("playing");
    expect(state.lawnMowers["mower-0"].state).toBe("ready");
    expect(state.zombies.z1).toMatchObject({
      isUnderground: false,
      direction: "right",
      x: DIGGER_EMERGE_X,
      speedColsPerSec: DIGGER_EMERGED_SPEED_COLS_PER_SEC,
      isEating: false,
    });

    useGameStore.getState().tick(DIGGER_EMERGE_PAUSE_MS - 1);
    expect(useGameStore.getState().zombies.z1).toMatchObject({
      x: DIGGER_EMERGE_X,
      isEating: false,
    });

    useGameStore.getState().tick(1);
    state = useGameStore.getState();
    expect(state.zombies.z1).toMatchObject({
      isEating: true,
      direction: "right",
    });
    expect(state.plants[state.zombies.z1.eatTargetId ?? ""]?.plantType).toBe("PEASHOOTER");
  });

  it("lets Pogo jump over multiple regular plants until a Tall-nut removes the pogo stick", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 1000, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("TALL_NUT", 1, 3)).toBe(true);
    expect(useGameStore.getState().placePlant("WALL_NUT", 1, 4)).toBe(true);
    expect(useGameStore.getState().placePlant("PEASHOOTER", 1, 5)).toBe(true);
    useGameStore.setState({
      zombies: {
        z1: makeZombie({
          instanceId: "z1",
          zombieType: "POGO",
          lane: 1,
          x: 5.2,
          pogoStickActive: true,
          direction: "left",
        }),
      },
    });

    useGameStore.getState().tick(0);
    let pogo = useGameStore.getState().zombies.z1;
    expect(pogo.x).toBeCloseTo(4.35);
    expect(pogo).toMatchObject({
      isEating: false,
      pogoStickActive: true,
    });

    useGameStore.getState().tick(0);
    pogo = useGameStore.getState().zombies.z1;
    expect(pogo.x).toBeCloseTo(3.35);
    expect(pogo).toMatchObject({
      isEating: false,
      pogoStickActive: true,
    });

    useGameStore.getState().tick(0);
    const zombie = useGameStore.getState().zombies.z1;
    expect(zombie.x).toBeCloseTo(3.35);
    expect(zombie).toMatchObject({
      isEating: true,
      pogoStickActive: false,
      speedColsPerSec: POGO_WITHOUT_STICK_SPEED_COLS_PER_SEC,
    });
    expect(useGameStore.getState().plants[zombie.eatTargetId ?? ""]?.plantType).toBe("TALL_NUT");
  });

  it("prevents Pogo from jumping over a Pumpkin-protected Tall-nut", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 1000, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("TALL_NUT", 2, 3)).toBe(true);
    expect(useGameStore.getState().placePlant("PUMPKIN", 2, 3)).toBe(true);
    useGameStore.setState({
      zombies: {
        z1: makeZombie({
          instanceId: "z1",
          zombieType: "POGO",
          lane: 2,
          x: 3.2,
          pogoStickActive: true,
          direction: "left",
        }),
      },
    });

    useGameStore.getState().tick(0);
    const zombie = useGameStore.getState().zombies.z1;
    expect(zombie).toMatchObject({
      x: 3.2,
      isEating: true,
      pogoStickActive: false,
    });
    expect(useGameStore.getState().plants[zombie.eatTargetId ?? ""]?.plantType).toBe("PUMPKIN");
  });

  it("lets Gargantuar smash plants instead of eating them over time", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 1000, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("WALL_NUT", 3, 4)).toBe(true);
    const wallNutId = useGameStore.getState().grid[3][4].plantInstanceId;
    useGameStore.setState({
      zombies: {
        z1: makeZombie({
          instanceId: "z1",
          zombieType: "GARGANTUAR",
          lane: 3,
          x: 4.2,
          direction: "left",
          hasThrownImp: false,
        }),
      },
    });

    useGameStore.getState().tick(0);
    let state = useGameStore.getState();
    expect(state.plants[wallNutId ?? ""]).toBeUndefined();
    expect(state.grid[3][4].plantInstanceId).toBeNull();
    expect(state.zombies.z1.isEating).toBe(false);
    expect(state.zombies.z1.smashUntilMs).toBe(GARGANTUAR_SMASH_RECOVERY_MS);

    useGameStore.getState().tick(GARGANTUAR_SMASH_RECOVERY_MS - 1);
    state = useGameStore.getState();
    expect(state.zombies.z1.x).toBe(4.2);
    expect(state.zombies.z1.isEating).toBe(false);
  });

  it("throws one Imp into the back lawn once Gargantuar reaches half health", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ nextWaveAtMs: Number.MAX_SAFE_INTEGER });
    useGameStore.setState({
      zombies: {
        z1: makeZombie({
          instanceId: "z1",
          zombieType: "GARGANTUAR",
          lane: 2,
          x: GARGANTUAR_IMP_THROW_MIN_X + 0.1,
          health: GARGANTUAR_IMP_THROW_HEALTH_THRESHOLD,
          hasThrownImp: false,
          direction: "left",
        }),
      },
    });

    useGameStore.getState().tick(0);
    let zombies = Object.values(useGameStore.getState().zombies);
    const gargantuar = useGameStore.getState().zombies.z1;
    const imp = zombies.find((zombie) => zombie.zombieType === "IMP");

    expect(gargantuar.hasThrownImp).toBe(true);
    expect(imp).toBeDefined();
    expect(imp?.lane).toBe(2);
    expect(imp?.x).toBeGreaterThanOrEqual(GARGANTUAR_IMP_LANDING_MIN_X);
    expect(imp?.x).toBeLessThanOrEqual(GARGANTUAR_IMP_LANDING_MAX_X);

    useGameStore.getState().tick(0);
    zombies = Object.values(useGameStore.getState().zombies);
    expect(zombies.filter((zombie) => zombie.zombieType === "IMP")).toHaveLength(1);
  });

  it("does not throw the Imp once Gargantuar is too close to the house", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ nextWaveAtMs: Number.MAX_SAFE_INTEGER });
    useGameStore.setState({
      zombies: {
        z1: makeZombie({
          instanceId: "z1",
          zombieType: "GARGANTUAR",
          lane: 2,
          x: GARGANTUAR_IMP_THROW_MIN_X,
          health: GARGANTUAR_IMP_THROW_HEALTH_THRESHOLD,
          hasThrownImp: false,
          direction: "left",
        }),
      },
    });

    useGameStore.getState().tick(0);
    const zombies = Object.values(useGameStore.getState().zombies);
    expect(useGameStore.getState().zombies.z1.hasThrownImp).toBe(false);
    expect(zombies.some((zombie) => zombie.zombieType === "IMP")).toBe(false);
  });

  it("does not spawn zombie before its scheduled time", () => {
    useGameStore.getState().queueZombie("NORMAL", 0, 5000);
    useGameStore.getState().tick(3000);
    expect(Object.keys(useGameStore.getState().zombies)).toHaveLength(0);
  });

  it("uses the lane lawn mower on first breach and keeps the game alive", () => {
    useGameStore.setState({
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: -0.6 }),
      },
    });

    useGameStore.getState().tick(0);

    const state = useGameStore.getState();
    expect(state.status).toBe("playing");
    expect(state.zombies.z1).toBeUndefined();
    expect(state.lawnMowers["mower-0"]).toMatchObject({
      state: "active",
      lane: 0,
    });
    expect(state.totalZombiesKilled).toBe(1);
  });

  it("active lawn mower clears zombies as it rolls across its lane", () => {
    useGameStore.setState({
      lawnMowers: {
        ...useGameStore.getState().lawnMowers,
        "mower-0": {
          ...useGameStore.getState().lawnMowers["mower-0"],
          state: "active",
          x: 1.5,
          triggeredAtMs: 0,
        },
      },
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: 2 }),
        z2: makeZombie({ instanceId: "z2", lane: 1, x: 2 }),
      },
    });

    useGameStore.getState().tick(100);

    const state = useGameStore.getState();
    expect(state.zombies.z1).toBeUndefined();
    expect(state.zombies.z2).toBeDefined();
    expect(state.status).toBe("playing");
  });

  it("sets status to game-over when a zombie breaches after its lane mower is spent", () => {
    useGameStore.setState({
      lawnMowers: {
        ...useGameStore.getState().lawnMowers,
        "mower-0": {
          ...useGameStore.getState().lawnMowers["mower-0"],
          state: "spent",
          x: 10,
          triggeredAtMs: 0,
        },
      },
      zombies: {
        z1: makeZombie({ instanceId: "z1", lane: 0, x: -0.6 }),
      },
    });

    useGameStore.getState().tick(0);

    expect(useGameStore.getState().status).toBe("game-over");
  });
});

describe("selectSlot", () => {
  it("sets the selected slot index", () => {
    useGameStore.getState().selectSlot(2);
    expect(useGameStore.getState().selectedSlot).toBe(2);
  });

  it("clears the slot when set to null", () => {
    useGameStore.getState().selectSlot(1);
    useGameStore.getState().selectSlot(null);
    expect(useGameStore.getState().selectedSlot).toBeNull();
  });
});

describe("Magnet-shroom — strip magnetic armor", () => {
  const NIGHT_ENV: EnvironmentConfig = {
    type: "NIGHT", gridRows: 5, gridCols: 9,
    waterLaneIndices: [], gravesEnabled: true, fogEnabled: false,
    slopeEnabled: false, conveyorBelt: false, skyDropSun: false,
  };

  it("strips armorHealth from a Buckethead zombie in range after cooldown", () => {
    useGameStore.getState().initGame(NIGHT_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("MAGNET_SHROOM", 0, 4)).toBe(true);
    const magnetId = Object.keys(useGameStore.getState().plants)[0];

    // Force cooldown to have elapsed (lastAttackAtMs = 0, so any tick ≥ 3000 fires)
    useGameStore.setState({
      gameTimeMs: 3000,
      zombies: {
        z1: makeZombie({ instanceId: "z1", zombieType: "BUCKETHEAD", lane: 0, x: 5.5 }),
      },
    });
    useGameStore.getState().tick(0);

    const zombie = useGameStore.getState().zombies.z1;
    expect(zombie).toBeDefined();
    expect(zombie.armorHealth).toBe(0);
    expect(useGameStore.getState().plants[magnetId].lastAttackAtMs).toBe(3000);
  });

  it("strips armor from Screen Door zombie in range", () => {
    useGameStore.getState().initGame(NIGHT_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("MAGNET_SHROOM", 0, 4)).toBe(true);
    useGameStore.setState({
      gameTimeMs: 3000,
      zombies: {
        z1: makeZombie({ instanceId: "z1", zombieType: "SCREEN_DOOR", lane: 0, x: 5.0 }),
      },
    });
    useGameStore.getState().tick(0);

    expect(useGameStore.getState().zombies.z1.armorHealth).toBe(0);
  });

  it("does NOT strip armor from a Conehead (non-magnetic) zombie", () => {
    useGameStore.getState().initGame(NIGHT_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("MAGNET_SHROOM", 0, 4)).toBe(true);
    const coneArmorHealth = getZombieDef("CONEHEAD").armorHealth;
    useGameStore.setState({
      gameTimeMs: 3000,
      zombies: {
        z1: makeZombie({ instanceId: "z1", zombieType: "CONEHEAD", lane: 0, x: 5.0 }),
      },
    });
    useGameStore.getState().tick(0);

    expect(useGameStore.getState().zombies.z1.armorHealth).toBe(coneArmorHealth);
  });

  it("does NOT strip armor from a zombie out of range", () => {
    useGameStore.getState().initGame(NIGHT_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("MAGNET_SHROOM", 0, 4)).toBe(true);
    const bucketArmor = getZombieDef("BUCKETHEAD").armorHealth;
    useGameStore.setState({
      gameTimeMs: 3000,
      zombies: {
        // x=8.5 is more than 2.5 cols away from plant.col=4
        z1: makeZombie({ instanceId: "z1", zombieType: "BUCKETHEAD", lane: 0, x: 8.5 }),
      },
    });
    useGameStore.getState().tick(0);

    expect(useGameStore.getState().zombies.z1.armorHealth).toBe(bucketArmor);
  });

  it("does not fire again before cooldown resets", () => {
    useGameStore.getState().initGame(NIGHT_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ currentSun: 500, nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    expect(useGameStore.getState().placePlant("MAGNET_SHROOM", 0, 4)).toBe(true);
    const magnetId = Object.keys(useGameStore.getState().plants)[0];

    const bucketArmor = getZombieDef("BUCKETHEAD").armorHealth;
    useGameStore.setState({
      gameTimeMs: 3000,
      zombies: {
        z1: makeZombie({ instanceId: "z1", zombieType: "BUCKETHEAD", lane: 0, x: 5.0, armorHealth: bucketArmor }),
      },
    });
    useGameStore.getState().tick(0);
    // First tick: strips armor, lastAttackAtMs = 3000

    // Second zombie with armor appears but cooldown hasn't reset (3000ms elapsed = lastAttackAtMs)
    useGameStore.setState({
      zombies: {
        ...useGameStore.getState().zombies,
        z2: makeZombie({ instanceId: "z2", zombieType: "BUCKETHEAD", lane: 0, x: 5.5, armorHealth: bucketArmor }),
      },
    });
    useGameStore.getState().tick(1000); // gameTimeMs = 4000, cooldown ends at 3000+3000=6000

    expect(useGameStore.getState().zombies.z2.armorHealth).toBe(bucketArmor);
    expect(useGameStore.getState().plants[magnetId].lastAttackAtMs).toBe(3000);
  });
});

describe("Umbrella Leaf — Bungee and Catapult protection", () => {
  function makePlantDirect(
    plantType: string,
    row: number,
    col: number,
    overrides: Partial<RuntimePlant> = {}
  ): RuntimePlant {
    return {
      instanceId: `plant-${plantType}-${row}-${col}`,
      plantType, row, col,
      health: 300, maxHealth: 300,
      lastAttackAtMs: 0, lastSunAtMs: 0,
      isSleeping: false, isCharging: false, chargeEndsAtMs: 0, armedAtMs: null,
      blocksAerial: false,
      ...overrides,
    };
  }

  it("Bungee zombie grabs plant at its position when unprotected", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    const peashooter = makePlantDirect("PEASHOOTER", 0, 5);
    // Bungee at col=5, grab fires at t=2000
    const bungee: RuntimeZombie = {
      ...makeZombie({ zombieType: "BUNGEE", lane: 0, x: 5, isAerial: true }),
      bungeeGrabAtMs: 2_000,
    };

    useGameStore.setState({
      gameTimeMs: 2_000,
      plants: { [peashooter.instanceId]: peashooter },
      zombies: { bungee1: bungee },
    });
    useGameStore.getState().tick(0);

    // Plant removed, bungee retreated
    expect(useGameStore.getState().plants[peashooter.instanceId]).toBeUndefined();
    expect(useGameStore.getState().zombies.bungee1).toBeUndefined();
  });

  it("Umbrella Leaf blocks Bungee grab in the same cell", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    const peashooter = makePlantDirect("PEASHOOTER", 0, 5);
    const umbrella = makePlantDirect("UMBRELLA_LEAF", 0, 5);
    const bungee: RuntimeZombie = {
      ...makeZombie({ zombieType: "BUNGEE", lane: 0, x: 5, isAerial: true }),
      bungeeGrabAtMs: 2_000,
    };

    useGameStore.setState({
      gameTimeMs: 2_000,
      plants: {
        [peashooter.instanceId]: peashooter,
        [umbrella.instanceId]: umbrella,
      },
      zombies: { bungee1: bungee },
    });
    useGameStore.getState().tick(0);

    // Plant preserved (Umbrella Leaf blocked the grab)
    expect(useGameStore.getState().plants[peashooter.instanceId]).toBeDefined();
    // Bungee still retreats (blocked or not, it leaves)
    expect(useGameStore.getState().zombies.bungee1).toBeUndefined();
  });

  it("Umbrella Leaf in adjacent lane protects against Bungee", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    const peashooter = makePlantDirect("PEASHOOTER", 0, 5);
    // Umbrella Leaf is 1 lane away (lane 1, col 5) — within protection radius
    const umbrella = makePlantDirect("UMBRELLA_LEAF", 1, 5);
    const bungee: RuntimeZombie = {
      ...makeZombie({ zombieType: "BUNGEE", lane: 0, x: 5, isAerial: true }),
      bungeeGrabAtMs: 2_000,
    };

    useGameStore.setState({
      gameTimeMs: 2_000,
      plants: {
        [peashooter.instanceId]: peashooter,
        [umbrella.instanceId]: umbrella,
      },
      zombies: { bungee1: bungee },
    });
    useGameStore.getState().tick(0);

    expect(useGameStore.getState().plants[peashooter.instanceId]).toBeDefined();
  });

  it("Catapult deals damage to a plant ahead when unprotected", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    const peashooter = makePlantDirect("PEASHOOTER", 0, 3, { health: 100, maxHealth: 100 });
    const catapult: RuntimeZombie = {
      ...makeZombie({ zombieType: "CATAPULT", lane: 0, x: 7 }),
      catapultLastFireAtMs: 0,
    };

    useGameStore.setState({
      gameTimeMs: 3_000,
      plants: { [peashooter.instanceId]: peashooter },
      zombies: { cat1: catapult },
    });
    useGameStore.getState().tick(0);

    const remaining = useGameStore.getState().plants[peashooter.instanceId];
    // Plant should have taken 40 damage (CATAPULT_BASKETBALL_DAMAGE) or be dead
    if (remaining) {
      expect(remaining.health).toBeLessThan(100);
    } else {
      expect(remaining).toBeUndefined(); // killed in one shot
    }
  });

  it("Umbrella Leaf protects plant from Catapult basketball", () => {
    useGameStore.getState().initGame(DAY_ENV, EXTENDED_LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.setState({ nextWaveAtMs: Number.MAX_SAFE_INTEGER });

    const peashooter = makePlantDirect("PEASHOOTER", 0, 3, { health: 100, maxHealth: 100 });
    const umbrella = makePlantDirect("UMBRELLA_LEAF", 0, 3);
    const catapult: RuntimeZombie = {
      ...makeZombie({ zombieType: "CATAPULT", lane: 0, x: 7 }),
      catapultLastFireAtMs: 0,
    };

    useGameStore.setState({
      gameTimeMs: 3_000,
      plants: {
        [peashooter.instanceId]: peashooter,
        [umbrella.instanceId]: umbrella,
      },
      zombies: { cat1: catapult },
    });
    useGameStore.getState().tick(0);

    expect(useGameStore.getState().plants[peashooter.instanceId]?.health).toBe(100);
  });
});

describe("reset", () => {
  it("resets all state to initial values", () => {
    useGameStore.getState().initGame(DAY_ENV, LOADOUT);
    useGameStore.getState().startGame();
    useGameStore.getState().reset();
    const state = useGameStore.getState();
    expect(state.status).toBe("idle");
    expect(state.currentSun).toBe(50);
    expect(Object.keys(state.plants)).toHaveLength(0);
    expect(Object.keys(state.zombies)).toHaveLength(0);
    expect(state.grid).toHaveLength(0);
  });
});
