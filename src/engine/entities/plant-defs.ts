import type { PlantDefinition } from "../types";
import {
  SUNFLOWER_PRODUCE_INTERVAL_MS,
  SUNSHROOM_PRODUCE_INTERVAL_MS,
  SUNSHROOM_SMALL_VALUE,
} from "../constants";

export const PLANT_DEFINITIONS: Record<string, PlantDefinition> = {
  PEASHOOTER: {
    plantType: "PEASHOOTER", sunCost: 100, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 1500, attackRange: "lane",
    projectileType: "PEA", trajectory: "straight",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  SUNFLOWER: {
    plantType: "SUNFLOWER", sunCost: 50, rechargeTime: 7, health: 300,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: true,
    sunProduceIntervalMs: SUNFLOWER_PRODUCE_INTERVAL_MS, sunProduceAmount: 25,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  CHERRY_BOMB: {
    plantType: "CHERRY_BOMB", sunCost: 150, rechargeTime: 50, health: 300,
    attackDamage: 1800, attackCooldownMs: null, attackRange: "aoe",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: true, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  WALL_NUT: {
    plantType: "WALL_NUT", sunCost: 50, rechargeTime: 30, health: 4000,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  POTATO_MINE: {
    plantType: "POTATO_MINE", sunCost: 25, rechargeTime: 30, health: 300,
    attackDamage: 1800, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  SNOW_PEA: {
    plantType: "SNOW_PEA", sunCost: 175, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 1500, attackRange: "lane",
    projectileType: "FROZEN_PEA", trajectory: "straight",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  CHOMPER: {
    plantType: "CHOMPER", sunCost: 150, rechargeTime: 7, health: 300,
    attackDamage: 1800, attackCooldownMs: 42_000, attackRange: "lane",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  REPEATER: {
    plantType: "REPEATER", sunCost: 200, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 1500, attackRange: "lane",
    projectileType: "PEA", trajectory: "straight",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  PUFF_SHROOM: {
    plantType: "PUFF_SHROOM", sunCost: 0, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 1500, attackRange: "lane",
    projectileType: "SPORE", trajectory: "straight",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: true, isMushroomType: true, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  SUN_SHROOM: {
    plantType: "SUN_SHROOM", sunCost: 25, rechargeTime: 7, health: 300,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: true,
    sunProduceIntervalMs: SUNSHROOM_PRODUCE_INTERVAL_MS, sunProduceAmount: SUNSHROOM_SMALL_VALUE,
    isNightOnly: true, isMushroomType: true, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  FUME_SHROOM: {
    plantType: "FUME_SHROOM", sunCost: 75, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 1500, attackRange: "lane",
    projectileType: "FUME", trajectory: "straight",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: true, isMushroomType: true, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  SCAREDY_SHROOM: {
    plantType: "SCAREDY_SHROOM", sunCost: 25, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 1500, attackRange: "lane",
    projectileType: "SPORE", trajectory: "straight",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: true, isMushroomType: true, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  ICE_SHROOM: {
    plantType: "ICE_SHROOM", sunCost: 75, rechargeTime: 50, health: 300,
    attackDamage: 0, attackCooldownMs: null, attackRange: "aoe",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: true, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: true, isMushroomType: true, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  DOOM_SHROOM: {
    plantType: "DOOM_SHROOM", sunCost: 125, rechargeTime: 50, health: 300,
    attackDamage: 1800, attackCooldownMs: null, attackRange: "aoe",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: true, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: true, isMushroomType: true, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  LILY_PAD: {
    plantType: "LILY_PAD", sunCost: 25, rechargeTime: 7, health: 300,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: true, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  SQUASH: {
    plantType: "SQUASH", sunCost: 50, rechargeTime: 30, health: 300,
    attackDamage: 1800, attackCooldownMs: null, attackRange: "lane",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: true, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  THREEPEATER: {
    plantType: "THREEPEATER", sunCost: 325, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 1500, attackRange: "lane",
    projectileType: "PEA", trajectory: "straight",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  TANGLE_KELP: {
    plantType: "TANGLE_KELP", sunCost: 25, rechargeTime: 30, health: 300,
    attackDamage: 1800, attackCooldownMs: null, attackRange: "lane",
    projectileType: null, trajectory: null,
    isAquatic: true, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: true, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  JALAPENO: {
    plantType: "JALAPENO", sunCost: 125, rechargeTime: 50, health: 300,
    attackDamage: 1800, attackCooldownMs: null, attackRange: "lane",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: true, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  SPIKEWEED: {
    plantType: "SPIKEWEED", sunCost: 100, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 1000, attackRange: "lane",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  TORCHWOOD: {
    plantType: "TORCHWOOD", sunCost: 175, rechargeTime: 7, health: 450,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  TALL_NUT: {
    plantType: "TALL_NUT", sunCost: 125, rechargeTime: 30, health: 8000,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: true, revealsFog: false, divertsZombies: false,
  },
  SEA_SHROOM: {
    plantType: "SEA_SHROOM", sunCost: 0, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 1500, attackRange: "lane",
    projectileType: "SPORE", trajectory: "straight",
    isAquatic: true, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: true, isMushroomType: true, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  PLANTERN: {
    plantType: "PLANTERN", sunCost: 25, rechargeTime: 7, health: 300,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: true, divertsZombies: false,
  },
  CACTUS: {
    plantType: "CACTUS", sunCost: 125, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 1500, attackRange: "lane",
    projectileType: "SPIKE", trajectory: "straight",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: true, revealsFog: false, divertsZombies: false,
  },
  BLOVER: {
    plantType: "BLOVER", sunCost: 100, rechargeTime: 30, health: 300,
    attackDamage: 1800, attackCooldownMs: null, attackRange: "aoe",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: true, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: true, divertsZombies: false,
  },
  SPLIT_PEA: {
    plantType: "SPLIT_PEA", sunCost: 125, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 1500, attackRange: "lane",
    projectileType: "PEA", trajectory: "straight",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  STARFRUIT: {
    plantType: "STARFRUIT", sunCost: 125, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 1500, attackRange: "aoe",
    projectileType: "STAR", trajectory: "straight",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  PUMPKIN: {
    plantType: "PUMPKIN", sunCost: 125, rechargeTime: 30, health: 4000,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  MAGNET_SHROOM: {
    plantType: "MAGNET_SHROOM", sunCost: 100, rechargeTime: 30, health: 300,
    attackDamage: 0, attackCooldownMs: 3000, attackRange: "aoe",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: true, isMushroomType: true, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  CABBAGE_PULT: {
    plantType: "CABBAGE_PULT", sunCost: 100, rechargeTime: 7, health: 300,
    attackDamage: 40, attackCooldownMs: 3000, attackRange: "lane",
    projectileType: "CABBAGE", trajectory: "lobbed",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  FLOWER_POT: {
    plantType: "FLOWER_POT", sunCost: 25, rechargeTime: 7, health: 300,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  KERNEL_PULT: {
    plantType: "KERNEL_PULT", sunCost: 100, rechargeTime: 7, health: 300,
    attackDamage: 20, attackCooldownMs: 3000, attackRange: "lane",
    projectileType: "KERNEL", trajectory: "lobbed",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  COFFEE_BEAN: {
    plantType: "COFFEE_BEAN", sunCost: 75, rechargeTime: 7, health: 300,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: true, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  GARLIC: {
    plantType: "GARLIC", sunCost: 50, rechargeTime: 30, health: 400,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: true,
  },
  UMBRELLA_LEAF: {
    plantType: "UMBRELLA_LEAF", sunCost: 100, rechargeTime: 7, health: 300,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  MARIGOLD: {
    plantType: "MARIGOLD", sunCost: 50, rechargeTime: 30, health: 300,
    attackDamage: null, attackCooldownMs: null, attackRange: "none",
    projectileType: null, trajectory: null,
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: true, sunProduceIntervalMs: 30_000, sunProduceAmount: 25,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
  MELON_PULT: {
    plantType: "MELON_PULT", sunCost: 300, rechargeTime: 7, health: 300,
    attackDamage: 80, attackCooldownMs: 3000, attackRange: "aoe",
    projectileType: "MELON", trajectory: "lobbed",
    isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false,
    isInstantUse: false, produceSun: false, sunProduceIntervalMs: null, sunProduceAmount: null,
    isNightOnly: false, isMushroomType: false, blocksAerial: false, revealsFog: false, divertsZombies: false,
  },
};

export function getPlantDef(plantType: string): PlantDefinition {
  const def = PLANT_DEFINITIONS[plantType];
  if (!def) throw new Error(`Unknown plant type: ${plantType}`);
  return def;
}

export function getAllPlantTypes(): string[] {
  return Object.keys(PLANT_DEFINITIONS);
}

export function getPlantsByCategory(filters: {
  isNightOnly?: boolean;
  isAquatic?: boolean;
  isInstantUse?: boolean;
  produceSun?: boolean;
  isMushroomType?: boolean;
  blocksAerial?: boolean;
}): PlantDefinition[] {
  return Object.values(PLANT_DEFINITIONS).filter((def) => {
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && def[key as keyof PlantDefinition] !== val) return false;
    }
    return true;
  });
}
