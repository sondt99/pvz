import { describe, it, expect, beforeEach } from "vitest";
import {
  findNearestZombieInLane,
  shouldPlantAttack,
  plantFire,
  plantProduceSun,
  resetPlantAiCounters,
} from "@/engine/ai/plant-ai";
import type { RuntimePlant, RuntimeZombie } from "@/engine/types";
import { getPlantDef } from "@/engine/entities/plant-defs";

beforeEach(() => resetPlantAiCounters());

function makePlant(overrides: Partial<RuntimePlant> = {}): RuntimePlant {
  return {
    instanceId: "p1", plantType: "PEASHOOTER", row: 0, col: 2,
    health: 300, maxHealth: 300,
    lastAttackAtMs: 0, lastSunAtMs: 0,
    isSleeping: false, isCharging: false, chargeEndsAtMs: 0, armedAtMs: null,
    ...overrides,
  };
}

function makeZombie(overrides: Partial<RuntimeZombie> = {}): RuntimeZombie {
  return {
    instanceId: "z1", zombieType: "NORMAL", lane: 0, x: 7,
    health: 200, maxHealth: 200, armorHealth: 0,
    speedColsPerSec: 0.5, eatDamagePerSec: 100,
    isEating: false, eatTargetId: null,
    statusEffects: [], isUnderground: false, isAerial: false, isFrozen: false,
    ...overrides,
  };
}

describe("findNearestZombieInLane", () => {
  it("returns null when no zombies", () => {
    expect(findNearestZombieInLane(0, {})).toBeNull();
  });

  it("returns nearest zombie in correct lane", () => {
    const zombies = {
      z1: makeZombie({ lane: 0, x: 7 }),
      z2: makeZombie({ instanceId: "z2", lane: 0, x: 5 }),
      z3: makeZombie({ instanceId: "z3", lane: 1, x: 8 }),
    };
    const result = findNearestZombieInLane(0, zombies);
    expect(result?.instanceId).toBe("z1"); // highest x in lane 0
  });

  it("ignores underground zombies", () => {
    const zombies = { z1: makeZombie({ isUnderground: true }) };
    expect(findNearestZombieInLane(0, zombies)).toBeNull();
  });
});

describe("shouldPlantAttack", () => {
  const def = getPlantDef("PEASHOOTER");

  it("returns true when zombie is in lane and cooldown elapsed", () => {
    const plant = makePlant({ lastAttackAtMs: 0 });
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    expect(shouldPlantAttack(plant, def, 2000, zombies)).toBe(true);
  });

  it("returns false when cooldown not elapsed", () => {
    const plant = makePlant({ lastAttackAtMs: 1900 });
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    expect(shouldPlantAttack(plant, def, 2000, zombies)).toBe(false);
  });

  it("returns false when no zombies in lane", () => {
    const plant = makePlant();
    expect(shouldPlantAttack(plant, def, 5000, {})).toBe(false);
  });

  it("returns false for sleeping plant", () => {
    const plant = makePlant({ isSleeping: true });
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    expect(shouldPlantAttack(plant, def, 5000, zombies)).toBe(false);
  });

  it("returns false for non-attacking plant (Sunflower)", () => {
    const sfDef = getPlantDef("SUNFLOWER");
    const plant = makePlant({ plantType: "SUNFLOWER" });
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    expect(shouldPlantAttack(plant, sfDef, 5000, zombies)).toBe(false);
  });
});

describe("plantFire", () => {
  it("creates a straight projectile for Peashooter", () => {
    const plant = makePlant({ col: 2 });
    const def = getPlantDef("PEASHOOTER");
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    const { projectile, updatedPlant } = plantFire(plant, def, 5000, zombies);
    expect(projectile).not.toBeNull();
    expect(projectile?.trajectory).toBe("straight");
    expect(projectile?.damage).toBe(20);
    expect(updatedPlant.lastAttackAtMs).toBe(5000);
  });

  it("creates a lobbed projectile for Cabbage-pult", () => {
    const plant = makePlant({ plantType: "CABBAGE_PULT", col: 1 });
    const def = getPlantDef("CABBAGE_PULT");
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    const { projectile } = plantFire(plant, def, 5000, zombies);
    expect(projectile?.trajectory).toBe("lobbed");
    expect(projectile?.targetCol).toBe(7);
  });

  it("returns null projectile when no zombie in lane", () => {
    const plant = makePlant();
    const def = getPlantDef("PEASHOOTER");
    const { projectile } = plantFire(plant, def, 5000, {});
    expect(projectile).toBeNull();
  });

  it("Snow Pea projectile has slowFactor=0.5", () => {
    const plant = makePlant({ plantType: "SNOW_PEA" });
    const def = getPlantDef("SNOW_PEA");
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    const { projectile } = plantFire(plant, def, 5000, zombies);
    expect(projectile?.slowFactor).toBe(0.5);
  });
});

describe("plantProduceSun", () => {
  const sfDef = getPlantDef("SUNFLOWER");

  it("produces sun when interval has elapsed", () => {
    const plant = makePlant({ plantType: "SUNFLOWER", lastSunAtMs: 0 });
    const { sunDrop, updatedPlant } = plantProduceSun(plant, sfDef, 24000);
    expect(sunDrop).not.toBeNull();
    expect(sunDrop?.value).toBe(25);
    expect(updatedPlant.lastSunAtMs).toBe(24000);
  });

  it("returns null when interval not elapsed", () => {
    const plant = makePlant({ plantType: "SUNFLOWER", lastSunAtMs: 10000 });
    const { sunDrop } = plantProduceSun(plant, sfDef, 23000);
    expect(sunDrop).toBeNull();
  });

  it("returns null for non-producer (Peashooter)", () => {
    const plant = makePlant();
    const def = getPlantDef("PEASHOOTER");
    const { sunDrop } = plantProduceSun(plant, def, 99999);
    expect(sunDrop).toBeNull();
  });

  it("does not produce sun when plant is sleeping", () => {
    const plant = makePlant({ plantType: "SUNFLOWER", isSleeping: true });
    const { sunDrop } = plantProduceSun(plant, sfDef, 24000);
    expect(sunDrop).toBeNull();
  });
});
