import { describe, it, expect } from "vitest";
import { getZombieDef, getAllZombieTypes, ZOMBIE_DEFINITIONS } from "@/engine/entities/zombie-defs";

const ALL_ZOMBIE_TYPES = [
  "NORMAL", "FLAG", "CONEHEAD", "BUCKETHEAD", "NEWSPAPER", "SCREEN_DOOR",
  "FOOTBALL", "DANCING", "BACKUP_DANCER", "DUCKY_TUBE", "SNORKEL", "ZOMBONI",
  "BOBSLED", "DOLPHIN_RIDER", "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO",
  "YETI", "BUNGEE", "LADDER", "CATAPULT", "GARGANTUAR", "IMP", "DR_ZOMBIE",
  "PEASHOOTER_ZOMBIE", "WALL_NUT_ZOMBIE", "JALAPENO_ZOMBIE",
  "GATLING_PEA_ZOMBIE", "SQUASH_ZOMBIE", "TALL_NUT_ZOMBIE",
];

describe("ZOMBIE_DEFINITIONS completeness", () => {
  it("defines exactly 31 zombie types", () => {
    expect(Object.keys(ZOMBIE_DEFINITIONS)).toHaveLength(31);
  });

  it("contains all expected zombie types", () => {
    for (const type of ALL_ZOMBIE_TYPES) {
      expect(ZOMBIE_DEFINITIONS[type], `missing: ${type}`).toBeDefined();
    }
  });
});

describe("getZombieDef", () => {
  it("NORMAL zombie has correct base stats", () => {
    const def = getZombieDef("NORMAL");
    expect(def.health).toBe(200);
    expect(def.armorHealth).toBe(0);
    expect(def.armorLayers).toBe(0);
    expect(def.speedColsPerSec).toBeCloseTo(1 / 4.7);
    expect(def.eatDamagePerSec).toBe(100);
    expect(def.isAerial).toBe(false);
    expect(def.isUnderground).toBe(false);
    expect(def.isBoss).toBe(false);
  });

  it("CONEHEAD has armor (370 HP cone)", () => {
    const def = getZombieDef("CONEHEAD");
    expect(def.armorHealth).toBe(370);
    expect(def.armorLayers).toBe(1);
    expect(def.health).toBe(200);
  });

  it("BUCKETHEAD has heavy armor (1100 HP bucket)", () => {
    const def = getZombieDef("BUCKETHEAD");
    expect(def.armorHealth).toBe(1100);
    expect(def.armorLayers).toBe(1);
  });

  it("FOOTBALL zombie is faster than NORMAL", () => {
    const normal = getZombieDef("NORMAL");
    const football = getZombieDef("FOOTBALL");
    expect(football.speedColsPerSec).toBeGreaterThan(normal.speedColsPerSec);
  });

  it("GARGANTUAR is a boss with massive health and eat damage", () => {
    const def = getZombieDef("GARGANTUAR");
    expect(def.isBoss).toBe(true);
    expect(def.health).toBe(3000);
    expect(def.eatDamagePerSec).toBe(1800);
  });

  it("BALLOON is aerial", () => {
    expect(getZombieDef("BALLOON").isAerial).toBe(true);
  });

  it("BUNGEE is aerial", () => {
    expect(getZombieDef("BUNGEE").isAerial).toBe(true);
  });

  it("DIGGER is underground", () => {
    expect(getZombieDef("DIGGER").isUnderground).toBe(true);
  });

  it("IMP is fast with low health (thrown by Gargantuar)", () => {
    const def = getZombieDef("IMP");
    expect(def.health).toBe(100);
    expect(def.speedColsPerSec).toBeCloseTo(1 / 2.4);
    expect(def.isBoss).toBe(false);
  });

  it("YETI has high health and good score value", () => {
    const def = getZombieDef("YETI");
    expect(def.health).toBe(1350);
    expect(def.scoreValue).toBe(1000);
  });

  it("WALL_NUT_ZOMBIE has very high health and is slow", () => {
    const def = getZombieDef("WALL_NUT_ZOMBIE");
    expect(def.health).toBe(4000);
    expect(def.speedColsPerSec).toBeCloseTo(1 / 6.2);
  });

  it("ZOMBONI has extremely high eat damage (crushes plants)", () => {
    expect(getZombieDef("ZOMBONI").eatDamagePerSec).toBe(9999);
  });

  it("throws for unknown zombie type", () => {
    expect(() => getZombieDef("UNICORN_ZOMBIE")).toThrow("Unknown zombie type");
  });
});

describe("getAllZombieTypes", () => {
  it("returns 31 zombie types", () => {
    expect(getAllZombieTypes()).toHaveLength(31);
  });

  it("includes GARGANTUAR and NORMAL", () => {
    const types = getAllZombieTypes();
    expect(types).toContain("GARGANTUAR");
    expect(types).toContain("NORMAL");
  });
});
