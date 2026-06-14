import { describe, it, expect, beforeEach } from "vitest";
import {
  findNearestZombieBehindInLane,
  findNearestZombieInLane,
  shouldPlantAttack,
  plantFire,
  plantProduceSun,
  resetPlantAiCounters,
  isScaredyShroomCowering,
} from "@/engine/ai/plant-ai";
import type { RuntimePlant, RuntimeZombie } from "@/engine/types";
import { getPlantDef } from "@/engine/entities/plant-defs";
import {
  FUME_SHROOM_RANGE_COLS,
  KERNEL_PULT_BUTTER_DAMAGE,
  KERNEL_PULT_BUTTER_STUN_MS,
  PUFF_SHROOM_RANGE_COLS,
} from "@/engine/constants";

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
    expect(result?.instanceId).toBe("z2");
  });

  it("ignores zombies behind the source column", () => {
    const zombies = {
      z1: makeZombie({ lane: 0, x: 1.5 }),
      z2: makeZombie({ instanceId: "z2", lane: 0, x: 5 }),
    };
    const result = findNearestZombieInLane(0, zombies, 2);
    expect(result?.instanceId).toBe("z2");
  });

  it("ignores underground zombies", () => {
    const zombies = { z1: makeZombie({ isUnderground: true }) };
    expect(findNearestZombieInLane(0, zombies)).toBeNull();
  });

  it("ignores submerged zombies unless explicitly requested", () => {
    const zombies = { z1: makeZombie({ isSubmerged: true }) };
    expect(findNearestZombieInLane(0, zombies)).toBeNull();
    expect(findNearestZombieInLane(0, zombies, -Infinity, { includeSubmerged: true })).not.toBeNull();
  });

  it("ignores aerial zombies unless explicitly requested", () => {
    const zombies = { z1: makeZombie({ isAerial: true }) };
    expect(findNearestZombieInLane(0, zombies)).toBeNull();
    expect(findNearestZombieInLane(0, zombies, -Infinity, { includeAerial: true })).not.toBeNull();
  });
});

describe("findNearestZombieBehindInLane", () => {
  it("returns the closest zombie behind the source column", () => {
    const zombies = {
      z1: makeZombie({ lane: 0, x: 0.5 }),
      z2: makeZombie({ instanceId: "z2", lane: 0, x: 1.8 }),
      z3: makeZombie({ instanceId: "z3", lane: 0, x: 5 }),
    };
    expect(findNearestZombieBehindInLane(0, zombies, 2)?.instanceId).toBe("z2");
  });
});

describe("shouldPlantAttack", () => {
  const def = getPlantDef("PEASHOOTER");
  const roofEnv = { slopeEnabled: true };

  it("returns true when zombie is in lane and cooldown elapsed", () => {
    const plant = makePlant({ lastAttackAtMs: 0 });
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    expect(shouldPlantAttack(plant, def, 2000, zombies)).toBe(true);
  });

  it("blocks straight shooters on the four leftmost roof columns", () => {
    const plant = makePlant({ col: 3 });
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    expect(shouldPlantAttack(plant, def, 5000, zombies, 5, roofEnv)).toBe(false);
  });

  it("allows straight shooters once planted above the blocked roof slope", () => {
    const plant = makePlant({ col: 4 });
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    expect(shouldPlantAttack(plant, def, 5000, zombies, 5, roofEnv)).toBe(true);
  });

  it("allows lobbers to attack from the blocked roof columns", () => {
    const cabbageDef = getPlantDef("CABBAGE_PULT");
    const plant = makePlant({ plantType: "CABBAGE_PULT", col: 0 });
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    expect(shouldPlantAttack(plant, cabbageDef, 5000, zombies, 5, roofEnv)).toBe(true);
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

  it("lets Threepeater attack when a zombie is in an adjacent covered lane", () => {
    const def = getPlantDef("THREEPEATER");
    const plant = makePlant({ plantType: "THREEPEATER", row: 2, col: 2 });
    const zombies = { z1: makeZombie({ lane: 1, x: 7 }) };
    expect(shouldPlantAttack(plant, def, 5000, zombies, 5)).toBe(true);
  });

  it("lets Split Pea attack zombies behind it", () => {
    const def = getPlantDef("SPLIT_PEA");
    const plant = makePlant({ plantType: "SPLIT_PEA", row: 0, col: 3 });
    const zombies = { z1: makeZombie({ lane: 0, x: 1.8 }) };
    expect(shouldPlantAttack(plant, def, 5000, zombies)).toBe(true);
  });

  it("lets Starfruit attack zombies behind and on diagonals", () => {
    const def = getPlantDef("STARFRUIT");
    const plant = makePlant({ plantType: "STARFRUIT", row: 2, col: 2 });

    expect(
      shouldPlantAttack(plant, def, 5000, {
        z1: makeZombie({ lane: 2, x: 1.5 }),
      })
    ).toBe(true);
    expect(
      shouldPlantAttack(plant, def, 5000, {
        z1: makeZombie({ lane: 1, x: 4.5 }),
      })
    ).toBe(true);
    expect(
      shouldPlantAttack(plant, def, 5000, {
        z1: makeZombie({ lane: 2, x: 7 }),
      })
    ).toBe(false);
  });

  it("does not let Peashooter attack a Balloon zombie", () => {
    const plant = makePlant({ plantType: "PEASHOOTER" });
    const zombies = { z1: makeZombie({ lane: 0, x: 7, isAerial: true }) };
    expect(shouldPlantAttack(plant, def, 5000, zombies)).toBe(false);
  });

  it("does not let straight shooters target submerged Snorkel, while lobbers can", () => {
    const peashooter = makePlant({ plantType: "PEASHOOTER" });
    const cabbage = makePlant({ plantType: "CABBAGE_PULT" });
    const submerged = { z1: makeZombie({ lane: 0, x: 7, zombieType: "SNORKEL", isSubmerged: true }) };

    expect(shouldPlantAttack(peashooter, getPlantDef("PEASHOOTER"), 5000, submerged)).toBe(false);
    expect(shouldPlantAttack(cabbage, getPlantDef("CABBAGE_PULT"), 5000, submerged)).toBe(true);
  });

  it("lets Cactus attack a Balloon zombie", () => {
    const cactusDef = getPlantDef("CACTUS");
    const plant = makePlant({ plantType: "CACTUS" });
    const zombies = { z1: makeZombie({ lane: 0, x: 7, isAerial: true }) };
    expect(shouldPlantAttack(plant, cactusDef, 5000, zombies)).toBe(true);
  });

  it("limits Puff-shroom targeting to its short 3-tile range", () => {
    const puffDef = getPlantDef("PUFF_SHROOM");
    const plant = makePlant({ plantType: "PUFF_SHROOM", col: 2 });

    expect(
      shouldPlantAttack(
        plant,
        puffDef,
        5000,
        { z1: makeZombie({ lane: 0, x: 2 + PUFF_SHROOM_RANGE_COLS }) }
      )
    ).toBe(true);

    expect(
      shouldPlantAttack(
        plant,
        puffDef,
        5000,
        { z1: makeZombie({ lane: 0, x: 2 + PUFF_SHROOM_RANGE_COLS + 0.1 }) }
      )
    ).toBe(false);
  });

  it("limits Fume-shroom targeting to its 4-tile piercing range", () => {
    const fumeDef = getPlantDef("FUME_SHROOM");
    const plant = makePlant({ plantType: "FUME_SHROOM", col: 2 });

    expect(
      shouldPlantAttack(
        plant,
        fumeDef,
        5000,
        { z1: makeZombie({ lane: 0, x: 2 + FUME_SHROOM_RANGE_COLS }) }
      )
    ).toBe(true);

    expect(
      shouldPlantAttack(
        plant,
        fumeDef,
        5000,
        { z1: makeZombie({ lane: 0, x: 2 + FUME_SHROOM_RANGE_COLS + 0.1 }) }
      )
    ).toBe(false);
  });

  it("makes Scaredy-shroom cower and stop attacking when a zombie enters its 3x3 area", () => {
    const scaredyDef = getPlantDef("SCAREDY_SHROOM");
    const plant = makePlant({ plantType: "SCAREDY_SHROOM", row: 2, col: 3 });
    const closeZombies = { z1: makeZombie({ lane: 1, x: 4.2 }) };
    const farZombies = { z1: makeZombie({ lane: 2, x: 7 }) };

    expect(isScaredyShroomCowering(plant, closeZombies)).toBe(true);
    expect(shouldPlantAttack(plant, scaredyDef, 5000, closeZombies)).toBe(false);
    expect(isScaredyShroomCowering(plant, farZombies)).toBe(false);
    expect(shouldPlantAttack(plant, scaredyDef, 5000, farZombies)).toBe(true);
  });
});

describe("plantFire", () => {
  const roofEnv = { slopeEnabled: true };

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

  it("does not create straight projectiles from the blocked roof columns", () => {
    const plant = makePlant({ col: 3 });
    const def = getPlantDef("PEASHOOTER");
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    const { projectile, projectiles, updatedPlant } = plantFire(plant, def, 5000, zombies, 5, Math.random, roofEnv);
    expect(projectile).toBeNull();
    expect(projectiles).toHaveLength(0);
    expect(updatedPlant.lastAttackAtMs).toBe(0);
  });

  it("creates a lobbed projectile for Cabbage-pult", () => {
    const plant = makePlant({ plantType: "CABBAGE_PULT", col: 1 });
    const def = getPlantDef("CABBAGE_PULT");
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    const { projectile } = plantFire(plant, def, 5000, zombies);
    expect(projectile?.trajectory).toBe("lobbed");
    expect(projectile?.targetCol).toBe(7);
  });

  it("can force Kernel-pult to fire a normal kernel", () => {
    const plant = makePlant({ plantType: "KERNEL_PULT", col: 1 });
    const def = getPlantDef("KERNEL_PULT");
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    const { projectile } = plantFire(plant, def, 5000, zombies, 5, () => 0.9);

    expect(projectile?.projectileType).toBe("KERNEL");
    expect(projectile?.damage).toBe(20);
    expect(projectile?.statusEffectOnHit).toBeUndefined();
  });

  it("can force Kernel-pult to fire butter that stuns on hit", () => {
    const plant = makePlant({ plantType: "KERNEL_PULT", col: 1 });
    const def = getPlantDef("KERNEL_PULT");
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    const { projectile } = plantFire(plant, def, 5000, zombies, 5, () => 0.1);

    expect(projectile?.projectileType).toBe("BUTTER");
    expect(projectile?.damage).toBe(KERNEL_PULT_BUTTER_DAMAGE);
    expect(projectile?.statusEffectOnHit).toEqual({
      type: "BUTTERED",
      durationMs: KERNEL_PULT_BUTTER_STUN_MS,
    });
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

  it("Repeater creates two forward pea projectiles per volley", () => {
    const plant = makePlant({ plantType: "REPEATER", col: 2 });
    const def = getPlantDef("REPEATER");
    const zombies = { z1: makeZombie({ lane: 0, x: 7 }) };
    const { projectiles } = plantFire(plant, def, 5000, zombies);
    expect(projectiles).toHaveLength(2);
    expect(projectiles.every((proj) => proj.velX > 0)).toBe(true);
  });

  it("Threepeater creates projectiles for its row and adjacent rows", () => {
    const plant = makePlant({ plantType: "THREEPEATER", row: 2, col: 2 });
    const def = getPlantDef("THREEPEATER");
    const zombies = { z1: makeZombie({ lane: 1, x: 7 }) };
    const { projectiles } = plantFire(plant, def, 5000, zombies, 5);
    expect(projectiles.map((proj) => proj.lane)).toEqual([1, 2, 3]);
  });

  it("Threepeater omits out-of-bounds lanes on top row", () => {
    const plant = makePlant({ plantType: "THREEPEATER", row: 0, col: 2 });
    const def = getPlantDef("THREEPEATER");
    const zombies = { z1: makeZombie({ lane: 1, x: 7 }) };
    const { projectiles } = plantFire(plant, def, 5000, zombies, 5);
    expect(projectiles.map((proj) => proj.lane)).toEqual([0, 1]);
  });

  it("Split Pea creates two backward peas when a zombie is behind it", () => {
    const plant = makePlant({ plantType: "SPLIT_PEA", row: 0, col: 3 });
    const def = getPlantDef("SPLIT_PEA");
    const zombies = { z1: makeZombie({ lane: 0, x: 1.8 }) };
    const { projectiles } = plantFire(plant, def, 5000, zombies);
    expect(projectiles).toHaveLength(2);
    expect(projectiles.every((proj) => proj.velX < 0)).toBe(true);
  });

  it("Starfruit creates five directional star projectiles", () => {
    const plant = makePlant({ plantType: "STARFRUIT", row: 2, col: 2 });
    const def = getPlantDef("STARFRUIT");
    const zombies = { z1: makeZombie({ lane: 1, x: 4.5 }) };
    const { projectiles } = plantFire(plant, def, 5000, zombies);

    expect(projectiles).toHaveLength(5);
    expect(projectiles.map((proj) => [proj.velX, proj.velLane ?? 0])).toEqual([
      [-8, 0],
      [0, -8],
      [0, 8],
      [8, -4],
      [8, 4],
    ]);
    expect(projectiles.every((proj) => proj.projectileType === "STAR")).toBe(true);
  });

  it("Cactus projectiles can hit aerial zombies", () => {
    const plant = makePlant({ plantType: "CACTUS" });
    const def = getPlantDef("CACTUS");
    const zombies = { z1: makeZombie({ lane: 0, x: 7, isAerial: true }) };
    const { projectile } = plantFire(plant, def, 5000, zombies);
    expect(projectile?.canHitAerial).toBe(true);
  });

  it("adds max travel distance to Puff-shroom spores", () => {
    const plant = makePlant({ plantType: "PUFF_SHROOM", col: 2 });
    const def = getPlantDef("PUFF_SHROOM");
    const zombies = { z1: makeZombie({ lane: 0, x: 5 }) };
    const { projectile } = plantFire(plant, def, 5000, zombies);
    expect(projectile?.maxTravelDistanceCols).toBe(PUFF_SHROOM_RANGE_COLS);
  });

  it("adds piercing and max travel distance to Fume-shroom fumes", () => {
    const plant = makePlant({ plantType: "FUME_SHROOM", col: 2 });
    const def = getPlantDef("FUME_SHROOM");
    const zombies = { z1: makeZombie({ lane: 0, x: 6 }) };
    const { projectile } = plantFire(plant, def, 5000, zombies);
    expect(projectile?.piercing).toBe(true);
    expect(projectile?.maxTravelDistanceCols).toBe(FUME_SHROOM_RANGE_COLS);
  });

  it("returns no projectile when Scaredy-shroom is cowering", () => {
    const plant = makePlant({ plantType: "SCAREDY_SHROOM", row: 2, col: 3 });
    const def = getPlantDef("SCAREDY_SHROOM");
    const zombies = { z1: makeZombie({ lane: 2, x: 4 }) };
    const { projectile, projectiles, updatedPlant } = plantFire(plant, def, 5000, zombies);
    expect(projectile).toBeNull();
    expect(projectiles).toHaveLength(0);
    expect(updatedPlant.lastAttackAtMs).toBe(0);
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
