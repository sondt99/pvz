import {
  PrismaClient,
  EnvironmentType,
  PlantCategory,
  PlantType,
  Prisma,
  ProjectileType,
} from "@prisma/client";
import { SEED_PLANT_CATALOG } from "../src/data/seed-catalog";

const prisma = new PrismaClient();

function plantCategoryFor(plantType: PlantType): PlantCategory {
  switch (plantType) {
    case PlantType.SUNFLOWER:
    case PlantType.SUN_SHROOM:
    case PlantType.MARIGOLD:
      return PlantCategory.RESOURCE;
    case PlantType.CABBAGE_PULT:
    case PlantType.KERNEL_PULT:
    case PlantType.MELON_PULT:
      return PlantCategory.LOBBER;
    case PlantType.WALL_NUT:
    case PlantType.TALL_NUT:
    case PlantType.PUMPKIN:
      return PlantCategory.DEFENSE;
    case PlantType.CHOMPER:
    case PlantType.SQUASH:
      return PlantCategory.MELEE;
    case PlantType.CHERRY_BOMB:
    case PlantType.POTATO_MINE:
    case PlantType.ICE_SHROOM:
    case PlantType.DOOM_SHROOM:
    case PlantType.JALAPENO:
    case PlantType.BLOVER:
    case PlantType.COFFEE_BEAN:
      return PlantCategory.INSTANT;
    case PlantType.LILY_PAD:
    case PlantType.FLOWER_POT:
      return PlantCategory.PLATFORM;
    case PlantType.SEA_SHROOM:
    case PlantType.TANGLE_KELP:
      return PlantCategory.AQUATIC;
    case PlantType.PLANTERN:
    case PlantType.TORCHWOOD:
    case PlantType.MAGNET_SHROOM:
    case PlantType.GARLIC:
    case PlantType.UMBRELLA_LEAF:
    case PlantType.SPIKEWEED:
      return PlantCategory.SUPPORT;
    default:
      return PlantCategory.SHOOTER;
  }
}

function projectileTypeFor(plantType: PlantType): ProjectileType | null {
  switch (plantType) {
    case PlantType.PEASHOOTER:
    case PlantType.REPEATER:
    case PlantType.THREEPEATER:
    case PlantType.SPLIT_PEA:
      return ProjectileType.PEA;
    case PlantType.SNOW_PEA:
      return ProjectileType.SNOW_PEA_PROJECTILE;
    case PlantType.CABBAGE_PULT:
      return ProjectileType.CABBAGE;
    case PlantType.KERNEL_PULT:
      return ProjectileType.KERNEL;
    case PlantType.MELON_PULT:
      return ProjectileType.MELON;
    case PlantType.STARFRUIT:
      return ProjectileType.STAR;
    case PlantType.SPIKEWEED:
      return ProjectileType.SPIKE;
    default:
      return null;
  }
}

function environmentDefaults(environmentType: EnvironmentType) {
  const isWater = environmentType === EnvironmentType.POOL || environmentType === EnvironmentType.FOG;
  const isNightLike = environmentType === EnvironmentType.NIGHT || environmentType === EnvironmentType.FOG;

  return {
    gridRows: isWater ? 6 : 5,
    gridCols: 9,
    waterLaneIndices: isWater ? [2, 3] : [],
    gravesEnabled: environmentType === EnvironmentType.NIGHT,
    fogEnabled: environmentType === EnvironmentType.FOG,
    slopeEnabled: environmentType === EnvironmentType.ROOF,
    conveyorBelt: false,
    skyDropSun: !isNightLike,
    startingSun: 50,
    environmentConfig: {
      timeOfDay: isNightLike ? "night" : "day",
      hasPool: isWater,
      hasFog: environmentType === EnvironmentType.FOG,
      hasRoofSlope: environmentType === EnvironmentType.ROOF,
      skyDropSun: !isNightLike,
      waterLaneIndices: isWater ? [2, 3] : [],
    },
  };
}

const levels = [
  { levelNumber: 1, name: "1-1", worldNumber: 1, stageNumber: 1, environmentType: EnvironmentType.DAY, unlockRequirement: { type: "noRequirement" } },
  { levelNumber: 2, name: "1-2", worldNumber: 1, stageNumber: 2, environmentType: EnvironmentType.DAY, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 3, name: "1-3", worldNumber: 1, stageNumber: 3, environmentType: EnvironmentType.DAY, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 4, name: "1-4", worldNumber: 1, stageNumber: 4, environmentType: EnvironmentType.DAY, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 5, name: "1-5", worldNumber: 1, stageNumber: 5, environmentType: EnvironmentType.DAY, unlockRequirement: { type: "completePrevious" }, briefingText: "The zombies are coming in waves now!" },
  { levelNumber: 6, name: "1-6", worldNumber: 1, stageNumber: 6, environmentType: EnvironmentType.DAY, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 7, name: "1-7", worldNumber: 1, stageNumber: 7, environmentType: EnvironmentType.DAY, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 8, name: "1-8", worldNumber: 1, stageNumber: 8, environmentType: EnvironmentType.DAY, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 9, name: "1-9", worldNumber: 1, stageNumber: 9, environmentType: EnvironmentType.DAY, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 10, name: "1-10", worldNumber: 1, stageNumber: 10, environmentType: EnvironmentType.DAY, unlockRequirement: { type: "completePrevious" }, briefingText: "Final wave incoming!" },
  { levelNumber: 11, name: "2-1", worldNumber: 2, stageNumber: 1, environmentType: EnvironmentType.NIGHT, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 12, name: "2-2", worldNumber: 2, stageNumber: 2, environmentType: EnvironmentType.NIGHT, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 13, name: "2-3", worldNumber: 2, stageNumber: 3, environmentType: EnvironmentType.NIGHT, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 14, name: "2-4", worldNumber: 2, stageNumber: 4, environmentType: EnvironmentType.NIGHT, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 15, name: "2-5", worldNumber: 2, stageNumber: 5, environmentType: EnvironmentType.NIGHT, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 16, name: "2-6", worldNumber: 2, stageNumber: 6, environmentType: EnvironmentType.NIGHT, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 17, name: "2-7", worldNumber: 2, stageNumber: 7, environmentType: EnvironmentType.NIGHT, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 18, name: "2-8", worldNumber: 2, stageNumber: 8, environmentType: EnvironmentType.NIGHT, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 19, name: "2-9", worldNumber: 2, stageNumber: 9, environmentType: EnvironmentType.NIGHT, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 20, name: "2-10", worldNumber: 2, stageNumber: 10, environmentType: EnvironmentType.NIGHT, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 21, name: "3-1", worldNumber: 3, stageNumber: 1, environmentType: EnvironmentType.POOL, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 22, name: "3-2", worldNumber: 3, stageNumber: 2, environmentType: EnvironmentType.POOL, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 23, name: "3-3", worldNumber: 3, stageNumber: 3, environmentType: EnvironmentType.POOL, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 24, name: "3-4", worldNumber: 3, stageNumber: 4, environmentType: EnvironmentType.POOL, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 25, name: "3-5", worldNumber: 3, stageNumber: 5, environmentType: EnvironmentType.POOL, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 26, name: "3-6", worldNumber: 3, stageNumber: 6, environmentType: EnvironmentType.POOL, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 27, name: "3-7", worldNumber: 3, stageNumber: 7, environmentType: EnvironmentType.POOL, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 28, name: "3-8", worldNumber: 3, stageNumber: 8, environmentType: EnvironmentType.POOL, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 29, name: "3-9", worldNumber: 3, stageNumber: 9, environmentType: EnvironmentType.POOL, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 30, name: "3-10", worldNumber: 3, stageNumber: 10, environmentType: EnvironmentType.POOL, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 31, name: "4-1", worldNumber: 4, stageNumber: 1, environmentType: EnvironmentType.FOG, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 32, name: "4-2", worldNumber: 4, stageNumber: 2, environmentType: EnvironmentType.FOG, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 33, name: "4-3", worldNumber: 4, stageNumber: 3, environmentType: EnvironmentType.FOG, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 34, name: "4-4", worldNumber: 4, stageNumber: 4, environmentType: EnvironmentType.FOG, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 35, name: "4-5", worldNumber: 4, stageNumber: 5, environmentType: EnvironmentType.FOG, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 36, name: "4-6", worldNumber: 4, stageNumber: 6, environmentType: EnvironmentType.FOG, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 37, name: "4-7", worldNumber: 4, stageNumber: 7, environmentType: EnvironmentType.FOG, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 38, name: "4-8", worldNumber: 4, stageNumber: 8, environmentType: EnvironmentType.FOG, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 39, name: "4-9", worldNumber: 4, stageNumber: 9, environmentType: EnvironmentType.FOG, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 40, name: "4-10", worldNumber: 4, stageNumber: 10, environmentType: EnvironmentType.FOG, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 41, name: "5-1", worldNumber: 5, stageNumber: 1, environmentType: EnvironmentType.ROOF, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 42, name: "5-2", worldNumber: 5, stageNumber: 2, environmentType: EnvironmentType.ROOF, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 43, name: "5-3", worldNumber: 5, stageNumber: 3, environmentType: EnvironmentType.ROOF, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 44, name: "5-4", worldNumber: 5, stageNumber: 4, environmentType: EnvironmentType.ROOF, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 45, name: "5-5", worldNumber: 5, stageNumber: 5, environmentType: EnvironmentType.ROOF, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 46, name: "5-6", worldNumber: 5, stageNumber: 6, environmentType: EnvironmentType.ROOF, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 47, name: "5-7", worldNumber: 5, stageNumber: 7, environmentType: EnvironmentType.ROOF, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 48, name: "5-8", worldNumber: 5, stageNumber: 8, environmentType: EnvironmentType.ROOF, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 49, name: "5-9", worldNumber: 5, stageNumber: 9, environmentType: EnvironmentType.ROOF, unlockRequirement: { type: "completePrevious" } },
  { levelNumber: 50, name: "5-10", worldNumber: 5, stageNumber: 10, environmentType: EnvironmentType.ROOF, unlockRequirement: { type: "completePrevious" }, briefingText: "Dr. Zomboss Final Battle!" },
];

async function main() {
  console.log("Seeding SeedPackets...");
  for (const packet of SEED_PLANT_CATALOG) {
    const plantType = packet.plantType as PlantType;
    const stats = packet.stats as Prisma.InputJsonObject;
    await prisma.seedPacket.upsert({
      where: { plantId: packet.plantId },
      update: {
        displayName: packet.displayName,
        plantType,
        category: plantCategoryFor(plantType),
        behaviorKey: packet.plantId,
        projectileType: projectileTypeFor(plantType),
        sunCost: packet.sunCost,
        rechargeTime: packet.rechargeTime,
        stats,
        isNightOnly: packet.isNightOnly,
        isMushroomType: packet.isMushroomType,
        isAquatic: packet.isAquatic,
        requiresLilyPad: packet.requiresLilyPad,
      },
      create: {
        plantId: packet.plantId,
        displayName: packet.displayName,
        plantType,
        category: plantCategoryFor(plantType),
        behaviorKey: packet.plantId,
        projectileType: projectileTypeFor(plantType),
        sunCost: packet.sunCost,
        rechargeTime: packet.rechargeTime,
        stats,
        isNightOnly: packet.isNightOnly,
        isMushroomType: packet.isMushroomType,
        isAquatic: packet.isAquatic,
        requiresLilyPad: packet.requiresLilyPad,
      },
    });
  }
  console.log(`Seeded ${SEED_PLANT_CATALOG.length} seed packets.`);

  console.log("Seeding Levels...");
  for (const level of levels) {
    const defaults = environmentDefaults(level.environmentType);
    await prisma.level.upsert({
      where: { levelNumber: level.levelNumber },
      update: {
        name: level.name,
        worldNumber: level.worldNumber,
        stageNumber: level.stageNumber,
        environmentType: level.environmentType,
        unlockRequirement: level.unlockRequirement,
        briefingText: level.briefingText ?? null,
        ...defaults,
      },
      create: {
        levelNumber: level.levelNumber,
        name: level.name,
        worldNumber: level.worldNumber,
        stageNumber: level.stageNumber,
        environmentType: level.environmentType,
        unlockRequirement: level.unlockRequirement,
        briefingText: level.briefingText ?? null,
        ...defaults,
      },
    });
  }
  console.log(`Seeded ${levels.length} levels.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
