// ---------------------------------------------------------------------------
// Canonical seed data for SeedPacket rows — the single source of truth shared
// between prisma/seed.ts and the consistency tests.
// No Prisma imports so this can be imported anywhere.
// ---------------------------------------------------------------------------

export interface SeedPlantEntry {
  plantId: string;
  displayName: string;
  plantType: string;
  sunCost: number;
  /** Recharge time in seconds (matches PlantDefinition.rechargeTime) */
  rechargeTime: number;
  isNightOnly: boolean;
  isMushroomType: boolean;
  isAquatic: boolean;
  requiresLilyPad: boolean;
  stats: Record<string, unknown>;
}

export const SEED_PLANT_CATALOG: SeedPlantEntry[] = [
  { plantId: "peashooter",    displayName: "Peashooter",    plantType: "PEASHOOTER",    sunCost: 100, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 20, range: "full-lane" } },
  { plantId: "sunflower",     displayName: "Sunflower",     plantType: "SUNFLOWER",     sunCost: 50,  rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { sunProduction: 25 } },
  { plantId: "cherry-bomb",   displayName: "Cherry Bomb",   plantType: "CHERRY_BOMB",   sunCost: 150, rechargeTime: 50, isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 1800, aoeRadius: 1 } },
  { plantId: "wall-nut",      displayName: "Wall-nut",      plantType: "WALL_NUT",      sunCost: 50,  rechargeTime: 30, isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { health: 4000 } },
  { plantId: "potato-mine",   displayName: "Potato Mine",   plantType: "POTATO_MINE",   sunCost: 25,  rechargeTime: 30, isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 1800, armTime: 14 } },
  { plantId: "snow-pea",      displayName: "Snow Pea",      plantType: "SNOW_PEA",      sunCost: 175, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 20, slows: true } },
  { plantId: "chomper",       displayName: "Chomper",       plantType: "CHOMPER",       sunCost: 150, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 1800, chewTime: 42 } },
  { plantId: "repeater",      displayName: "Repeater",      plantType: "REPEATER",      sunCost: 200, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 20, shotsPerCycle: 2 } },
  { plantId: "puff-shroom",   displayName: "Puff-shroom",   plantType: "PUFF_SHROOM",   sunCost: 0,   rechargeTime: 7,  isNightOnly: true,  isMushroomType: true,  isAquatic: false, requiresLilyPad: false, stats: { health: 300, duration: 120 } },
  { plantId: "sun-shroom",    displayName: "Sun-shroom",    plantType: "SUN_SHROOM",    sunCost: 25,  rechargeTime: 7,  isNightOnly: true,  isMushroomType: true,  isAquatic: false, requiresLilyPad: false, stats: { sunProduction: 15 } },
  { plantId: "fume-shroom",   displayName: "Fume-shroom",   plantType: "FUME_SHROOM",   sunCost: 75,  rechargeTime: 7,  isNightOnly: true,  isMushroomType: true,  isAquatic: false, requiresLilyPad: false, stats: { damage: 20, piercing: true } },
  { plantId: "scaredy-shroom", displayName: "Scaredy-shroom", plantType: "SCAREDY_SHROOM", sunCost: 25, rechargeTime: 7, isNightOnly: true, isMushroomType: true, isAquatic: false, requiresLilyPad: false, stats: { damage: 20, hidesWhenNear: true } },
  { plantId: "ice-shroom",    displayName: "Ice-shroom",    plantType: "ICE_SHROOM",    sunCost: 75,  rechargeTime: 50, isNightOnly: true,  isMushroomType: true,  isAquatic: false, requiresLilyPad: false, stats: { freezeDuration: 5, aoe: true } },
  { plantId: "doom-shroom",   displayName: "Doom-shroom",   plantType: "DOOM_SHROOM",   sunCost: 125, rechargeTime: 50, isNightOnly: true,  isMushroomType: true,  isAquatic: false, requiresLilyPad: false, stats: { damage: 1800, aoeRadius: 3, leavesHole: true } },
  { plantId: "lily-pad",      displayName: "Lily Pad",      plantType: "LILY_PAD",      sunCost: 25,  rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: true,  requiresLilyPad: false, stats: {} },
  { plantId: "squash",        displayName: "Squash",        plantType: "SQUASH",        sunCost: 50,  rechargeTime: 30, isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 1800 } },
  { plantId: "threepeater",   displayName: "Threepeater",   plantType: "THREEPEATER",   sunCost: 325, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 20, lanes: 3 } },
  { plantId: "tangle-kelp",   displayName: "Tangle Kelp",   plantType: "TANGLE_KELP",   sunCost: 25,  rechargeTime: 30, isNightOnly: false, isMushroomType: false, isAquatic: true,  requiresLilyPad: false, stats: { damage: 1800 } },
  { plantId: "jalapeno",      displayName: "Jalapeno",      plantType: "JALAPENO",      sunCost: 125, rechargeTime: 50, isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 1800, clearsLane: true } },
  { plantId: "spikeweed",     displayName: "Spikeweed",     plantType: "SPIKEWEED",     sunCost: 100, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 20, stopsVehicles: true } },
  { plantId: "torchwood",     displayName: "Torchwood",     plantType: "TORCHWOOD",     sunCost: 175, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { upgrades: "pea-to-fire" } },
  { plantId: "tall-nut",      displayName: "Tall-nut",      plantType: "TALL_NUT",      sunCost: 125, rechargeTime: 30, isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { health: 8000, blocksAerial: true } },
  { plantId: "sea-shroom",    displayName: "Sea-shroom",    plantType: "SEA_SHROOM",    sunCost: 0,   rechargeTime: 7,  isNightOnly: true,  isMushroomType: true,  isAquatic: true,  requiresLilyPad: false, stats: { damage: 20 } },
  { plantId: "plantern",      displayName: "Plantern",      plantType: "PLANTERN",      sunCost: 25,  rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { revealsFog: true, radius: 2 } },
  { plantId: "cactus",        displayName: "Cactus",        plantType: "CACTUS",        sunCost: 125, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 20, popsBalloons: true } },
  { plantId: "blover",        displayName: "Blover",        plantType: "BLOVER",        sunCost: 100, rechargeTime: 30, isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { blowsFog: true, blowsBalloons: true } },
  { plantId: "split-pea",     displayName: "Split Pea",     plantType: "SPLIT_PEA",     sunCost: 125, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { shootsFront: true, shootsBack: true } },
  { plantId: "starfruit",     displayName: "Starfruit",     plantType: "STARFRUIT",     sunCost: 125, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { directions: 5 } },
  { plantId: "pumpkin",       displayName: "Pumpkin",       plantType: "PUMPKIN",       sunCost: 125, rechargeTime: 30, isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { health: 4000, isArmor: true } },
  { plantId: "magnet-shroom", displayName: "Magnet-shroom", plantType: "MAGNET_SHROOM", sunCost: 100, rechargeTime: 30, isNightOnly: true,  isMushroomType: true,  isAquatic: false, requiresLilyPad: false, stats: { removesArmor: true } },
  { plantId: "cabbage-pult",  displayName: "Cabbage-pult",  plantType: "CABBAGE_PULT",  sunCost: 100, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 40, lobbed: true } },
  { plantId: "flower-pot",    displayName: "Flower Pot",    plantType: "FLOWER_POT",    sunCost: 25,  rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { requiredForRoof: true } },
  { plantId: "kernel-pult",   displayName: "Kernel-pult",   plantType: "KERNEL_PULT",   sunCost: 100, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 20, butterDamage: 40, lobbed: true } },
  { plantId: "coffee-bean",   displayName: "Coffee Bean",   plantType: "COFFEE_BEAN",   sunCost: 75,  rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { wakesMushroom: true } },
  { plantId: "garlic",        displayName: "Garlic",        plantType: "GARLIC",        sunCost: 50,  rechargeTime: 30, isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { health: 400, divertsZombies: true } },
  { plantId: "umbrella-leaf", displayName: "Umbrella Leaf", plantType: "UMBRELLA_LEAF", sunCost: 100, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { blocksLobbed: true, blocksBungee: true } },
  { plantId: "marigold",      displayName: "Marigold",      plantType: "MARIGOLD",      sunCost: 50,  rechargeTime: 30, isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { sunProduction: 150, duration: 120 } },
  { plantId: "melon-pult",    displayName: "Melon-pult",    plantType: "MELON_PULT",    sunCost: 300, rechargeTime: 7,  isNightOnly: false, isMushroomType: false, isAquatic: false, requiresLilyPad: false, stats: { damage: 80, aoeDamage: 40, lobbed: true } },
];

export const SEED_PLANT_BY_TYPE: Map<string, SeedPlantEntry> = new Map(
  SEED_PLANT_CATALOG.map((p) => [p.plantType, p])
);
