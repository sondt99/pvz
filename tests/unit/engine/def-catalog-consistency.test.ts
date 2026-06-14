/**
 * Consistency tests between the runtime plant-defs and the seeded DB catalog.
 * Both sources are imported directly — no DB connection required.
 * These tests catch drifts where engine behavior and catalog metadata diverge.
 */
import { describe, it, expect } from "vitest";
import { PLANT_DEFINITIONS } from "@/engine/entities/plant-defs";
import { SEED_PLANT_CATALOG, SEED_PLANT_BY_TYPE } from "@/data/seed-catalog";

describe("plant-defs vs seed-catalog coverage", () => {
  it("every plant in PLANT_DEFINITIONS has a matching seed entry", () => {
    for (const plantType of Object.keys(PLANT_DEFINITIONS)) {
      expect(
        SEED_PLANT_BY_TYPE.has(plantType),
        `plant-defs has ${plantType} but seed-catalog does not`
      ).toBe(true);
    }
  });

  it("every seed entry has a matching runtime definition", () => {
    for (const entry of SEED_PLANT_CATALOG) {
      expect(
        PLANT_DEFINITIONS[entry.plantType],
        `seed-catalog has ${entry.plantType} but plant-defs does not`
      ).toBeDefined();
    }
  });

  it("both catalogs have the same count (38 plants)", () => {
    expect(Object.keys(PLANT_DEFINITIONS)).toHaveLength(38);
    expect(SEED_PLANT_CATALOG).toHaveLength(38);
  });
});

describe("plant-defs vs seed-catalog field consistency", () => {
  for (const [plantType, def] of Object.entries(PLANT_DEFINITIONS)) {
    const seedEntry = SEED_PLANT_BY_TYPE.get(plantType);
    if (!seedEntry) continue; // covered by coverage test above

    it(`${plantType}: sunCost matches`, () => {
      expect(def.sunCost).toBe(seedEntry.sunCost);
    });

    it(`${plantType}: rechargeTime matches (seconds)`, () => {
      expect(def.rechargeTime).toBe(seedEntry.rechargeTime);
    });

    it(`${plantType}: isNightOnly matches`, () => {
      expect(def.isNightOnly).toBe(seedEntry.isNightOnly);
    });

    it(`${plantType}: isMushroomType matches`, () => {
      expect(def.isMushroomType).toBe(seedEntry.isMushroomType);
    });

    it(`${plantType}: isAquatic matches`, () => {
      expect(def.isAquatic).toBe(seedEntry.isAquatic);
    });

    it(`${plantType}: requiresLilyPad matches`, () => {
      expect(def.requiresLilyPad).toBe(seedEntry.requiresLilyPad);
    });
  }
});
