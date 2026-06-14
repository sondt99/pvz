import { describe, it, expect } from "vitest";
import { getPlantDef, getAllPlantTypes, getPlantsByCategory, PLANT_DEFINITIONS } from "@/engine/entities/plant-defs";

const ALL_PLANT_TYPES = [
  "PEASHOOTER", "SUNFLOWER", "CHERRY_BOMB", "WALL_NUT", "POTATO_MINE",
  "SNOW_PEA", "CHOMPER", "REPEATER", "PUFF_SHROOM", "SUN_SHROOM",
  "FUME_SHROOM", "SCAREDY_SHROOM", "ICE_SHROOM", "DOOM_SHROOM", "LILY_PAD",
  "SQUASH", "THREEPEATER", "TANGLE_KELP", "JALAPENO", "SPIKEWEED",
  "TORCHWOOD", "TALL_NUT", "SEA_SHROOM", "PLANTERN", "CACTUS",
  "BLOVER", "SPLIT_PEA", "STARFRUIT", "PUMPKIN", "MAGNET_SHROOM",
  "CABBAGE_PULT", "FLOWER_POT", "KERNEL_PULT", "COFFEE_BEAN", "GARLIC",
  "UMBRELLA_LEAF", "MARIGOLD", "MELON_PULT",
];

describe("PLANT_DEFINITIONS completeness", () => {
  it("defines exactly 38 plants", () => {
    expect(Object.keys(PLANT_DEFINITIONS)).toHaveLength(38);
  });

  it("contains all expected plant types", () => {
    for (const type of ALL_PLANT_TYPES) {
      expect(PLANT_DEFINITIONS[type], `missing: ${type}`).toBeDefined();
    }
  });
});

describe("getPlantDef", () => {
  it("returns definition for PEASHOOTER", () => {
    const def = getPlantDef("PEASHOOTER");
    expect(def.sunCost).toBe(100);
    expect(def.health).toBe(300);
    expect(def.trajectory).toBe("straight");
    expect(def.projectileType).toBe("PEA");
    expect(def.attackDamage).toBe(20);
    expect(def.attackCooldownMs).toBe(1500);
  });

  it("returns definition for SUNFLOWER with sun production", () => {
    const def = getPlantDef("SUNFLOWER");
    expect(def.sunCost).toBe(50);
    expect(def.produceSun).toBe(true);
    expect(def.sunProduceIntervalMs).toBe(24000);
    expect(def.sunProduceAmount).toBe(25);
    expect(def.attackDamage).toBeNull();
  });

  it("CHERRY_BOMB is instant-use AoE", () => {
    const def = getPlantDef("CHERRY_BOMB");
    expect(def.isInstantUse).toBe(true);
    expect(def.attackRange).toBe("aoe");
    expect(def.sunCost).toBe(150);
    expect(def.attackDamage).toBe(1800);
  });

  it("SQUASH is planted first, then triggers on nearby zombies", () => {
    const def = getPlantDef("SQUASH");
    expect(def.isInstantUse).toBe(false);
    expect(def.attackRange).toBe("lane");
    expect(def.attackDamage).toBe(1800);
  });

  it("WALL_NUT has high health and no attack", () => {
    const def = getPlantDef("WALL_NUT");
    expect(def.health).toBe(4000);
    expect(def.attackDamage).toBeNull();
    expect(def.attackRange).toBe("none");
  });

  it("SNOW_PEA fires FROZEN_PEA projectile", () => {
    const def = getPlantDef("SNOW_PEA");
    expect(def.projectileType).toBe("FROZEN_PEA");
    expect(def.sunCost).toBe(175);
  });

  it("LILY_PAD is aquatic and costs 25 sun", () => {
    const def = getPlantDef("LILY_PAD");
    expect(def.isAquatic).toBe(true);
    expect(def.sunCost).toBe(25);
  });

  it("TALL_NUT has blocksAerial=true and high health", () => {
    const def = getPlantDef("TALL_NUT");
    expect(def.blocksAerial).toBe(true);
    expect(def.health).toBe(8000);
  });

  it("PLANTERN has revealsFog=true", () => {
    expect(getPlantDef("PLANTERN").revealsFog).toBe(true);
  });

  it("GARLIC has divertsZombies=true", () => {
    expect(getPlantDef("GARLIC").divertsZombies).toBe(true);
  });

  it("MELON_PULT fires lobbed trajectory", () => {
    const def = getPlantDef("MELON_PULT");
    expect(def.trajectory).toBe("lobbed");
    expect(def.projectileType).toBe("MELON");
    expect(def.sunCost).toBe(300);
    expect(def.attackDamage).toBe(80);
  });

  it("CABBAGE_PULT fires lobbed CABBAGE projectile", () => {
    const def = getPlantDef("CABBAGE_PULT");
    expect(def.trajectory).toBe("lobbed");
    expect(def.projectileType).toBe("CABBAGE");
    expect(def.attackDamage).toBe(40);
  });

  it("PUFF_SHROOM is night-only mushroom and costs 0 sun", () => {
    const def = getPlantDef("PUFF_SHROOM");
    expect(def.isNightOnly).toBe(true);
    expect(def.isMushroomType).toBe(true);
    expect(def.sunCost).toBe(0);
  });

  it("throws for unknown plant type", () => {
    expect(() => getPlantDef("BANANA_TREE")).toThrow("Unknown plant type");
  });
});

describe("getAllPlantTypes", () => {
  it("returns 38 plant types", () => {
    expect(getAllPlantTypes()).toHaveLength(38);
  });

  it("includes PEASHOOTER and MELON_PULT", () => {
    const types = getAllPlantTypes();
    expect(types).toContain("PEASHOOTER");
    expect(types).toContain("MELON_PULT");
  });
});

describe("getPlantsByCategory", () => {
  it("returns only night-only plants when isNightOnly=true", () => {
    const nightPlants = getPlantsByCategory({ isNightOnly: true });
    expect(nightPlants.length).toBeGreaterThan(0);
    expect(nightPlants.every((d) => d.isNightOnly)).toBe(true);
  });

  it("returns only aquatic plants when isAquatic=true", () => {
    const aquatics = getPlantsByCategory({ isAquatic: true });
    const types = aquatics.map((d) => d.plantType);
    expect(types).toContain("LILY_PAD");
    expect(types).toContain("TANGLE_KELP");
    expect(types).toContain("SEA_SHROOM");
    expect(aquatics.every((d) => d.isAquatic)).toBe(true);
  });

  it("returns only sun producers when produceSun=true", () => {
    const producers = getPlantsByCategory({ produceSun: true });
    expect(producers.every((d) => d.produceSun)).toBe(true);
    const types = producers.map((d) => d.plantType);
    expect(types).toContain("SUNFLOWER");
    expect(types).toContain("SUN_SHROOM");
    expect(types).toContain("MARIGOLD");
  });

  it("returns only mushroom-type plants when isMushroomType=true", () => {
    const shrooms = getPlantsByCategory({ isMushroomType: true });
    expect(shrooms.every((d) => d.isMushroomType)).toBe(true);
  });

  it("returns only instant-use plants when isInstantUse=true", () => {
    const instants = getPlantsByCategory({ isInstantUse: true });
    const types = instants.map((d) => d.plantType);
    expect(types).toContain("CHERRY_BOMB");
    expect(types).toContain("JALAPENO");
    expect(types).not.toContain("SQUASH");
  });
});
