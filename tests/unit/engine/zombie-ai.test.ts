import { describe, it, expect } from "vitest";
import {
  getEffectiveSpeed,
  moveZombie,
  tickStatusEffects,
  isZombieEatingPlant,
  startEating,
  stopEating,
  applyEatingDamage,
  applyStatusEffect,
} from "@/engine/ai/zombie-ai";
import type { RuntimeZombie, RuntimePlant } from "@/engine/types";

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

function makePlant(overrides: Partial<RuntimePlant> = {}): RuntimePlant {
  return {
    instanceId: "p1", plantType: "WALL_NUT", row: 0, col: 4,
    health: 4000, maxHealth: 4000,
    lastAttackAtMs: 0, lastSunAtMs: 0,
    isSleeping: false, isCharging: false, chargeEndsAtMs: 0, armedAtMs: null,
    ...overrides,
  };
}

describe("getEffectiveSpeed", () => {
  it("returns normal speed when no effects", () => {
    expect(getEffectiveSpeed(makeZombie())).toBeCloseTo(0.5);
  });

  it("returns 0 when frozen", () => {
    expect(getEffectiveSpeed(makeZombie({ isFrozen: true }))).toBe(0);
  });

  it("returns halved speed when SLOWED", () => {
    const zombie = makeZombie({
      statusEffects: [{ type: "SLOWED", expiresAtMs: Infinity, factor: 0.5 }],
    });
    expect(getEffectiveSpeed(zombie)).toBeCloseTo(0.25);
  });
});

describe("moveZombie", () => {
  it("moves zombie left by speed * delta", () => {
    const result = moveZombie(makeZombie({ x: 7 }), 1000);
    expect(result.x).toBeCloseTo(6.5);
  });

  it("does not move frozen zombie", () => {
    const result = moveZombie(makeZombie({ x: 7, isFrozen: true }), 1000);
    expect(result.x).toBe(7);
  });

  it("does not move eating zombie", () => {
    const result = moveZombie(makeZombie({ x: 7, isEating: true }), 1000);
    expect(result.x).toBe(7);
  });
});

describe("tickStatusEffects", () => {
  it("removes expired effects", () => {
    const zombie = makeZombie({
      statusEffects: [{ type: "SLOWED", expiresAtMs: 4999, factor: 0.5 }],
    });
    const result = tickStatusEffects(zombie, 5000);
    expect(result.statusEffects).toHaveLength(0);
  });

  it("keeps active effects", () => {
    const zombie = makeZombie({
      statusEffects: [{ type: "FROZEN", expiresAtMs: 10000 }],
    });
    const result = tickStatusEffects(zombie, 5000);
    expect(result.statusEffects).toHaveLength(1);
    expect(result.isFrozen).toBe(true);
  });

  it("stops eating when zombie is frozen", () => {
    const zombie = makeZombie({
      isEating: true, eatTargetId: "p1",
      statusEffects: [{ type: "FROZEN", expiresAtMs: 10000 }],
    });
    const result = tickStatusEffects(zombie, 0);
    expect(result.isEating).toBe(false);
  });
});

describe("isZombieEatingPlant", () => {
  it("returns true when zombie is in range", () => {
    const zombie = makeZombie({ lane: 0, x: 4.3 });
    const plant = makePlant({ row: 0, col: 4 });
    expect(isZombieEatingPlant(zombie, plant)).toBe(true);
  });

  it("returns false in different lane", () => {
    const zombie = makeZombie({ lane: 1, x: 4.3 });
    const plant = makePlant({ row: 0, col: 4 });
    expect(isZombieEatingPlant(zombie, plant)).toBe(false);
  });

  it("returns false when zombie is too far right", () => {
    const zombie = makeZombie({ lane: 0, x: 5.5 });
    const plant = makePlant({ row: 0, col: 4 });
    expect(isZombieEatingPlant(zombie, plant)).toBe(false);
  });

  it("aerial zombies never eat", () => {
    const zombie = makeZombie({ lane: 0, x: 4.3, isAerial: true });
    const plant = makePlant({ row: 0, col: 4 });
    expect(isZombieEatingPlant(zombie, plant)).toBe(false);
  });
});

describe("startEating / stopEating", () => {
  it("startEating sets isEating and eatTargetId", () => {
    const result = startEating(makeZombie(), "plant-1");
    expect(result.isEating).toBe(true);
    expect(result.eatTargetId).toBe("plant-1");
  });

  it("stopEating clears eating state", () => {
    const eating = makeZombie({ isEating: true, eatTargetId: "plant-1" });
    const result = stopEating(eating);
    expect(result.isEating).toBe(false);
    expect(result.eatTargetId).toBeNull();
  });
});

describe("applyEatingDamage", () => {
  it("deals correct damage per delta", () => {
    const plant = makePlant({ health: 4000 });
    const zombie = makeZombie({ eatDamagePerSec: 100 });
    const result = applyEatingDamage(plant, zombie, 1000);
    expect(result.health).toBe(3900);
  });

  it("deals fractional damage for partial seconds", () => {
    const plant = makePlant({ health: 1000 });
    const zombie = makeZombie({ eatDamagePerSec: 100 });
    const result = applyEatingDamage(plant, zombie, 500);
    expect(result.health).toBeCloseTo(950);
  });
});

describe("applyStatusEffect", () => {
  it("adds a new effect", () => {
    const zombie = makeZombie();
    const result = applyStatusEffect(zombie, { type: "SLOWED", expiresAtMs: 5000, factor: 0.5 });
    expect(result.statusEffects).toHaveLength(1);
  });

  it("refreshes existing effect of same type", () => {
    const zombie = makeZombie({
      statusEffects: [{ type: "SLOWED", expiresAtMs: 3000, factor: 0.5 }],
    });
    const result = applyStatusEffect(zombie, { type: "SLOWED", expiresAtMs: 8000, factor: 0.5 });
    expect(result.statusEffects).toHaveLength(1);
    expect(result.statusEffects[0].expiresAtMs).toBe(8000);
  });

  it("sets isFrozen when FROZEN effect applied", () => {
    const zombie = makeZombie();
    const result = applyStatusEffect(zombie, { type: "FROZEN", expiresAtMs: 5000 });
    expect(result.isFrozen).toBe(true);
  });
});
