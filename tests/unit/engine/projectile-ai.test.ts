import { describe, it, expect } from "vitest";
import {
  advanceProjectile,
  shouldRemoveProjectile,
  findStraightHits,
  findLobbedHits,
  applyProjectileHits,
  transformProjectileWithTorchwood,
} from "@/engine/ai/projectile-ai";
import type { RuntimePlant, RuntimeProjectile, RuntimeZombie } from "@/engine/types";

function makeStr(overrides: Partial<RuntimeProjectile> = {}): RuntimeProjectile {
  return {
    instanceId: "p1", projectileType: "PEA", lane: 0,
    x: 5, y: 0, velX: 8, velY: 0, damage: 20,
    trajectory: "straight", sourceCol: 2,
    ...overrides,
  };
}

function makeLob(overrides: Partial<RuntimeProjectile> = {}): RuntimeProjectile {
  return {
    instanceId: "p2", projectileType: "CABBAGE", lane: 2,
    x: 1, y: 0, velX: 4, velY: -10, damage: 40,
    trajectory: "lobbed", sourceCol: 1, targetCol: 7, targetLane: 2,
    ...overrides,
  };
}

function makeZombie(id: string, overrides: Partial<RuntimeZombie> = {}): RuntimeZombie {
  return {
    instanceId: id, zombieType: "NORMAL", lane: 0, x: 5,
    health: 200, maxHealth: 200, armorHealth: 0,
    speedColsPerSec: 0.5, eatDamagePerSec: 100,
    isEating: false, eatTargetId: null,
    statusEffects: [], isUnderground: false, isAerial: false, isFrozen: false,
    ...overrides,
  };
}

function makePlant(overrides: Partial<RuntimePlant> = {}): RuntimePlant {
  return {
    instanceId: "plant-torchwood-1",
    plantType: "TORCHWOOD",
    row: 0,
    col: 3,
    health: 450,
    maxHealth: 450,
    lastAttackAtMs: 0,
    lastSunAtMs: 0,
    isSleeping: false,
    isCharging: false,
    chargeEndsAtMs: 0,
    armedAtMs: null,
    ...overrides,
  };
}

describe("advanceProjectile", () => {
  it("moves a straight projectile right", () => {
    const proj = makeStr({ x: 2, velX: 8 });
    const moved = advanceProjectile(proj, 1000);
    expect(moved.x).toBeCloseTo(10);
  });

  it("updates both x and y for lobbed projectile", () => {
    const proj = makeLob({ x: 1, velX: 4, y: 0, velY: -10 });
    const moved = advanceProjectile(proj, 500);
    expect(moved.x).toBeCloseTo(3);
    expect(moved.y).toBeCloseTo(-5);
  });
});

describe("shouldRemoveProjectile", () => {
  it("removes straight projectile that is offscreen", () => {
    expect(shouldRemoveProjectile(makeStr({ x: 10.5 }), 9)).toBe(true);
  });

  it("does not remove in-bounds straight projectile", () => {
    expect(shouldRemoveProjectile(makeStr({ x: 5 }), 9)).toBe(false);
  });

  it("removes straight projectile after its max travel distance", () => {
    expect(shouldRemoveProjectile(makeStr({ sourceCol: 2, x: 6, maxTravelDistanceCols: 4 }), 9)).toBe(true);
  });

  it("removes lobbed projectile when it reaches targetCol", () => {
    expect(shouldRemoveProjectile(makeLob({ x: 7, targetCol: 7 }), 9)).toBe(true);
  });
});

describe("findStraightHits", () => {
  it("finds zombie in same lane within hit radius", () => {
    const proj = makeStr({ lane: 0, x: 5, sourceCol: 2 });
    const zombies = { z1: makeZombie("z1", { lane: 0, x: 5.2 }) };
    expect(findStraightHits(proj, zombies)).toContain("z1");
  });

  it("returns empty when zombie is in different lane", () => {
    const proj = makeStr({ lane: 0, x: 5, sourceCol: 2 });
    const zombies = { z1: makeZombie("z1", { lane: 1, x: 5 }) };
    expect(findStraightHits(proj, zombies)).toHaveLength(0);
  });

  it("ignores underground zombies", () => {
    const proj = makeStr({ lane: 0, x: 5, sourceCol: 2 });
    const zombies = { z1: makeZombie("z1", { lane: 0, x: 5, isUnderground: true }) };
    expect(findStraightHits(proj, zombies)).toHaveLength(0);
  });

  it("piercing projectile hits all zombies in radius", () => {
    const proj = makeStr({ lane: 0, x: 5, sourceCol: 2, piercing: true });
    const zombies = {
      z1: makeZombie("z1", { lane: 0, x: 5.1 }),
      z2: makeZombie("z2", { lane: 0, x: 4.9 }),
    };
    const hits = findStraightHits(proj, zombies);
    expect(hits).toHaveLength(2);
  });

  it("does not hit zombies beyond a straight projectile max travel distance", () => {
    const proj = makeStr({ lane: 0, x: 6.2, sourceCol: 2, piercing: true, maxTravelDistanceCols: 4 });
    const zombies = {
      z1: makeZombie("z1", { lane: 0, x: 6 }),
      z2: makeZombie("z2", { lane: 0, x: 6.2 }),
    };
    expect(findStraightHits(proj, zombies)).toEqual(["z1"]);
  });

  it("uses projectile direction when choosing a backward hit", () => {
    const proj = makeStr({ lane: 0, x: 3, sourceCol: 5, velX: -8 });
    const zombies = {
      z1: makeZombie("z1", { lane: 0, x: 2.9 }),
      z2: makeZombie("z2", { lane: 0, x: 3.2 }),
    };
    expect(findStraightHits(proj, zombies)).toEqual(["z2"]);
  });

  it("does not let normal peas hit aerial zombies", () => {
    const proj = makeStr({ lane: 0, x: 5, sourceCol: 2 });
    const zombies = { z1: makeZombie("z1", { lane: 0, x: 5, isAerial: true }) };
    expect(findStraightHits(proj, zombies)).toHaveLength(0);
  });

  it("allows aerial hits when the projectile supports it", () => {
    const proj = makeStr({ lane: 0, x: 5, sourceCol: 2, canHitAerial: true });
    const zombies = { z1: makeZombie("z1", { lane: 0, x: 5, isAerial: true }) };
    expect(findStraightHits(proj, zombies)).toEqual(["z1"]);
  });
});

describe("findLobbedHits", () => {
  it("returns empty when projectile has not landed", () => {
    const proj = makeLob({ x: 3, targetCol: 7 });
    const zombies = { z1: makeZombie("z1", { lane: 2, x: 7 }) };
    expect(findLobbedHits(proj, zombies)).toHaveLength(0);
  });

  it("hits only one zombie for non-splash lobbed projectiles like Cabbage", () => {
    const proj = makeLob({ projectileType: "CABBAGE", x: 7, targetCol: 7, targetLane: 2 });
    const zombies = {
      z1: makeZombie("z1", { lane: 2, x: 7 }),
      z2: makeZombie("z2", { lane: 2, x: 7.4 }),
      z3: makeZombie("z3", { lane: 1, x: 7 }),
    };
    expect(findLobbedHits(proj, zombies)).toEqual(["z1"]);
  });

  it("finds nearby zombies in AoE for Melon splash when projectile lands", () => {
    const proj = makeLob({ projectileType: "MELON", x: 7, targetCol: 7, targetLane: 2 });
    const zombies = {
      z1: makeZombie("z1", { lane: 2, x: 7.5 }),
      z2: makeZombie("z2", { lane: 1, x: 7 }),
    };
    const hits = findLobbedHits(proj, zombies);
    expect(hits).toContain("z1");
    expect(hits).toContain("z2");
  });
});

describe("transformProjectileWithTorchwood", () => {
  it("turns a regular forward pea crossing Torchwood into a double-damage fire pea", () => {
    const proj = makeStr({ projectileType: "PEA", x: 3.2, sourceCol: 1, damage: 20 });
    const transformed = transformProjectileWithTorchwood(
      proj,
      { torchwood: makePlant({ row: 0, col: 3 }) },
      2.8
    );

    expect(transformed.projectileType).toBe("FIRE_PEA");
    expect(transformed.damage).toBe(40);
    expect(transformed.isFire).toBe(true);
  });

  it("melts Snow Pea projectiles into regular peas without applying fire damage", () => {
    const proj = makeStr({
      projectileType: "FROZEN_PEA",
      x: 3.2,
      sourceCol: 1,
      damage: 20,
      slowFactor: 0.5,
    });
    const transformed = transformProjectileWithTorchwood(
      proj,
      { torchwood: makePlant({ row: 0, col: 3 }) },
      2.8
    );

    expect(transformed.projectileType).toBe("PEA");
    expect(transformed.damage).toBe(20);
    expect(transformed.slowFactor).toBeUndefined();
    expect(transformed.isFire).toBeUndefined();
  });

  it("does not transform non-pea projectiles crossing Torchwood", () => {
    const proj = makeStr({ projectileType: "SPORE", x: 3.2, sourceCol: 1, damage: 20 });
    const transformed = transformProjectileWithTorchwood(
      proj,
      { torchwood: makePlant({ row: 0, col: 3 }) },
      2.8
    );

    expect(transformed).toEqual(proj);
  });

  it("does not transform backward peas", () => {
    const proj = makeStr({ projectileType: "PEA", x: 2.8, sourceCol: 4, damage: 20, velX: -8 });
    const transformed = transformProjectileWithTorchwood(
      proj,
      { torchwood: makePlant({ row: 0, col: 3 }) },
      3.2
    );

    expect(transformed).toEqual(proj);
  });
});

describe("applyProjectileHits", () => {
  it("applies damage and kills zombie with <= 0 health", () => {
    const proj = makeStr({ damage: 200 });
    const zombies = { z1: makeZombie("z1", { health: 200, armorHealth: 0 }) };
    const result = applyProjectileHits(proj, zombies, ["z1"]);
    expect(result.killedZombieIds).toContain("z1");
    expect(result.removeProjectile).toBe(true);
  });

  it("does not kill zombie with remaining health", () => {
    const proj = makeStr({ damage: 20 });
    const zombies = { z1: makeZombie("z1", { health: 200, armorHealth: 0 }) };
    const result = applyProjectileHits(proj, zombies, ["z1"]);
    expect(result.updatedZombies["z1"].health).toBe(180);
    expect(result.killedZombieIds).toHaveLength(0);
  });

  it("applies SLOWED status when proj has slowFactor", () => {
    const proj = makeStr({ damage: 20, slowFactor: 0.5 });
    const zombies = { z1: makeZombie("z1") };
    const result = applyProjectileHits(proj, zombies, ["z1"]);
    const effects = result.updatedZombies["z1"].statusEffects;
    expect(effects.some((e) => e.type === "SLOWED")).toBe(true);
  });

  it("applies BUTTERED status from butter projectiles with hit-time expiry", () => {
    const proj = makeLob({
      projectileType: "BUTTER",
      damage: 40,
      statusEffectOnHit: { type: "BUTTERED", durationMs: 5000 },
    });
    const zombies = { z1: makeZombie("z1", { health: 200, armorHealth: 0 }) };
    const result = applyProjectileHits(proj, zombies, ["z1"], 12_000);

    expect(result.updatedZombies.z1.health).toBe(160);
    expect(result.updatedZombies.z1.statusEffects).toContainEqual({
      type: "BUTTERED",
      expiresAtMs: 17_000,
    });
  });

  it("fire peas thaw frozen and slowed zombies on hit", () => {
    const proj = makeStr({ projectileType: "FIRE_PEA", damage: 20, isFire: true });
    const zombies = {
      z1: makeZombie("z1", {
        isFrozen: true,
        statusEffects: [
          { type: "FROZEN", expiresAtMs: 10_000 },
          { type: "SLOWED", expiresAtMs: Infinity, factor: 0.5 },
        ],
      }),
    };
    const result = applyProjectileHits(proj, zombies, ["z1"]);
    expect(result.updatedZombies.z1.isFrozen).toBe(false);
    expect(result.updatedZombies.z1.statusEffects).toEqual([]);
  });

  it("returns empty result for no hits", () => {
    const result = applyProjectileHits(makeStr(), {}, []);
    expect(result.killedZombieIds).toHaveLength(0);
    expect(result.removeProjectile).toBe(false);
  });
});
