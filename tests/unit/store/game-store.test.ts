import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/store/game-store";
import type { EnvironmentConfig, SeedPacketSlot } from "@/engine/types";
import { WAVE_INTERVAL_MS, SKY_SUN_INTERVAL_MS, ZOMBIE_SPAWN_X } from "@/engine/constants";

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

const LOADOUT: SeedPacketSlot[] = [
  { plantType: "PEASHOOTER", plantId: "peashooter", sunCost: 100, cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 0 },
  { plantType: "SUNFLOWER",  plantId: "sunflower",  sunCost: 50,  cooldownRemainingMs: 0, cooldownTotalMs: 7000, isSelected: false, slotIndex: 1 },
  { plantType: "WALL_NUT",   plantId: "wall-nut",   sunCost: 50,  cooldownRemainingMs: 0, cooldownTotalMs: 30000, isSelected: false, slotIndex: 2 },
];

function freshStore() {
  const store = useGameStore.getState();
  store.reset();
  return useGameStore.getState;
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

    useGameStore.getState().tick(1000); // 1 second; NORMAL speed=0.5 cols/s
    const after = useGameStore.getState().zombies[id];
    expect(after.x).toBeCloseTo(ZOMBIE_SPAWN_X - 0.5, 5);
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

  it("does not spawn zombie before its scheduled time", () => {
    useGameStore.getState().queueZombie("NORMAL", 0, 5000);
    useGameStore.getState().tick(3000);
    expect(Object.keys(useGameStore.getState().zombies)).toHaveLength(0);
  });

  it("sets status to game-over when a zombie reaches x <= -0.5", () => {
    useGameStore.getState().queueZombie("NORMAL", 0, 0);
    // tick(0): spawns the zombie (spawnAtMs=0 <= gameTimeMs=0) with no movement
    useGameStore.getState().tick(0);
    expect(Object.keys(useGameStore.getState().zombies)).toHaveLength(1);

    // NORMAL speed=0.5 cols/s; start x=9.5; reach -0.5 needs 20 s
    for (let i = 0; i < 20; i++) {
      useGameStore.getState().tick(1000);
    }
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
