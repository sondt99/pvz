import { describe, it, expect } from "vitest";
import { LEVEL_CONFIGS } from "@/data/level-configs";
import {
  SEED_CHOOSER_FROM_LEVEL,
  SHOVEL_UNLOCK_AFTER_LEVEL,
  shouldRequireSeedChooser,
  shovelUnlockedFromCompleted,
} from "@/data/level-play-modes";
import { plantIdsFromCompletedLevels } from "@/data/plant-progression";
import { getZombieDef } from "@/engine/entities/zombie-defs";

describe("Day 1–10 PvZ1 reward chain", () => {
  it("matches original Adventure Day plant rewards", () => {
    expect(LEVEL_CONFIGS[1].rewardPlantId).toBe("sunflower");
    expect(LEVEL_CONFIGS[2].rewardPlantId).toBe("cherry-bomb");
    expect(LEVEL_CONFIGS[3].rewardPlantId).toBe("wall-nut");
    expect(LEVEL_CONFIGS[4].rewardPlantId).toBe("potato-mine");
    expect(LEVEL_CONFIGS[5].rewardPlantId).toBe("snow-pea");
    expect(LEVEL_CONFIGS[6].rewardPlantId).toBe("chomper");
    expect(LEVEL_CONFIGS[7].rewardPlantId).toBe("repeater");
    expect(LEVEL_CONFIGS[8].rewardPlantId).toBeNull();
    expect(LEVEL_CONFIGS[9].rewardPlantId).toBeNull();
    expect(LEVEL_CONFIGS[10].rewardPlantId).toBe("puff-shroom");
  });

  it("unlocks Puff-shroom after completing 1-10", () => {
    const ids = plantIdsFromCompletedLevels([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(ids).toContain("puff-shroom");
    expect(ids).toContain("peashooter");
    expect(ids).toContain("sunflower");
  });
});

describe("Day 1–10 lawn row unlock (PvZ1)", () => {
  it("starts with 1 row, then 3, then full 5", () => {
    expect(LEVEL_CONFIGS[1].gridRows).toBe(1);
    expect(LEVEL_CONFIGS[2].gridRows).toBe(3);
    expect(LEVEL_CONFIGS[3].gridRows).toBe(3);
    // Full lawn from 1-4 onward (null = environment default of 5)
    expect(LEVEL_CONFIGS[4].gridRows).toBeNull();
    expect(LEVEL_CONFIGS[5].gridRows).toBeNull();
    expect(LEVEL_CONFIGS[10].gridRows).toBeNull();
  });

  it("scripts 1-1 zombies only on the single lane", () => {
    const waves = (
      LEVEL_CONFIGS[1].waveConfig as {
        waves: Array<{ entries?: Array<{ lane: number | string }> }>;
      }
    ).waves;
    for (const w of waves) {
      for (const e of w.entries ?? []) {
        expect(e.lane).toBe(0);
      }
    }
  });
});

describe("Day 1–10 play modes", () => {
  it("assigns tutorial / bowling / conveyor correctly", () => {
    expect(LEVEL_CONFIGS[1].playMode).toBe("TUTORIAL_SCRIPT");
    expect(LEVEL_CONFIGS[1].startingSun).toBe(150);
    expect(LEVEL_CONFIGS[1].skipSeedChooser).toBe(true);

    expect(LEVEL_CONFIGS[5].playMode).toBe("BOWLING");
    expect(LEVEL_CONFIGS[5].freePlacement).toBe(true);
    expect(LEVEL_CONFIGS[5].hideSunHud).toBe(true);
    expect(LEVEL_CONFIGS[5].bowlingNutTypes).toContain("WALL_NUT");

    expect(LEVEL_CONFIGS[10].playMode).toBe("CONVEYOR");
    expect(LEVEL_CONFIGS[10].conveyorBelt).toBe(true);
    expect(LEVEL_CONFIGS[10].conveyorPlantPool.length).toBeGreaterThan(0);
    expect(LEVEL_CONFIGS[10].freePlacement).toBe(true);
  });

  it("requires seed chooser from level 1-8 only", () => {
    for (let n = 1; n <= 7; n++) {
      expect(
        shouldRequireSeedChooser(n, LEVEL_CONFIGS[n]),
        `level ${n} should skip chooser`
      ).toBe(false);
    }
    expect(shouldRequireSeedChooser(8, LEVEL_CONFIGS[8])).toBe(true);
    expect(shouldRequireSeedChooser(9, LEVEL_CONFIGS[9])).toBe(true);
    expect(shouldRequireSeedChooser(10, LEVEL_CONFIGS[10])).toBe(false);
    expect(SEED_CHOOSER_FROM_LEVEL).toBe(8);
  });

  it("gates shovel after level 1-4", () => {
    expect(SHOVEL_UNLOCK_AFTER_LEVEL).toBe(4);
    expect(shovelUnlockedFromCompleted([])).toBe(false);
    expect(shovelUnlockedFromCompleted([1, 2, 3])).toBe(false);
    expect(shovelUnlockedFromCompleted([1, 2, 3, 4])).toBe(true);
    expect(shovelUnlockedFromCompleted([10])).toBe(true);
  });
});

describe("Day 1–10 zombie intros", () => {
  it("defines Pole Vaulting Zombie", () => {
    const def = getZombieDef("POLE_VAULT");
    expect(def.health).toBe(200);
    expect(def.speedColsPerSec).toBeGreaterThan(0);
  });

  it("introduces Pole Vault on level 1-6 waves", () => {
    const waves = (LEVEL_CONFIGS[6].waveConfig as { waves: Array<{ zombiePool?: string[] }> })
      .waves;
    const pools = waves.flatMap((w) => w.zombiePool ?? []);
    expect(pools).toContain("POLE_VAULT");
  });

  it("introduces Buckethead on level 1-8 (not earlier mid-day)", () => {
    const early = (LEVEL_CONFIGS[6].waveConfig as { waves: Array<{ zombiePool?: string[] }> }).waves
      .flatMap((w) => w.zombiePool ?? []);
    expect(early).not.toContain("BUCKETHEAD");

    const eight = (LEVEL_CONFIGS[8].waveConfig as { waves: Array<{ zombiePool?: string[] }> }).waves
      .flatMap((w) => w.zombiePool ?? []);
    expect(eight).toContain("BUCKETHEAD");
  });

  it("uses scripted entries for 1-1 tutorial", () => {
    const waves = (
      LEVEL_CONFIGS[1].waveConfig as {
        waves: Array<{ entries?: unknown[] }>;
      }
    ).waves;
    expect(waves[0].entries?.length).toBeGreaterThan(0);
  });
});
