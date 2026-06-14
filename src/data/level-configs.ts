// ---------------------------------------------------------------------------
// Level-by-level configurations following the original PvZ adventure mode.
// Each entry matches prisma/seed.ts levelNumber → Level.waveConfig (Json).
//
// WaveConfig shape (see src/engine/wave-generator.ts):
//   finalWaveNumber  – total waves in the level
//   flagEvery        – add FLAG zombie every N waves (default 5)
//   defaultZombiePool – fallback pool when a wave omits zombiePool
//   waves[]:
//     waveNumber     – 1-indexed, matches by index if omitted
//     zombiePool     – types to pick from randomly
//     count          – how many to spawn
//     intervalMs     – ms between each zombie in this wave
//     startDelayMs   – ms before first zombie of this wave
//     flag           – force FLAG zombie in this wave
//     final          – mark as the last wave
//     entries[]      – explicit spawns (overrides pool/count)
//       zombieType, lane ("random" | number | number[]), spawnAtMs
// ---------------------------------------------------------------------------

export interface LevelConfig {
  rewardPlantId: string | null;
  briefingText: string | null;
  seedSlots: number;
  waveConfig: object;
}

// Helper: build a pool-based wave
function wave(
  waveNumber: number,
  zombiePool: string[],
  count: number,
  intervalMs = 2000,
  opts: { flag?: boolean; final?: boolean; startDelayMs?: number } = {}
) {
  return { waveNumber, zombiePool, count, intervalMs, ...opts };
}

// Helper: named tuple [rewardPlantId, briefingText, seedSlots, waveConfig]
type LC = [string | null, string | null, number, object];

// ---------------------------------------------------------------------------
// WORLD 1 — DAY (Levels 1-10)
// Zombie intro: NORMAL → CONEHEAD (1-3) → BUCKETHEAD (1-8)
// ---------------------------------------------------------------------------

const W1: Record<number, LC> = {
  1: [
    "sunflower",
    "The zombies are approaching! Plant a Peashooter to stop them.",
    2,
    {
      finalWaveNumber: 2,
      waves: [
        wave(1, ["NORMAL"], 3, 3000),
        wave(2, ["NORMAL"], 4, 2500, { final: true }),
      ],
    },
  ],
  2: [
    "cherry-bomb",
    "Sunflowers produce sun you can use to plant more plants. Grow them first!",
    3,
    {
      finalWaveNumber: 3,
      waves: [
        wave(1, ["NORMAL"], 3, 3000),
        wave(2, ["NORMAL"], 4, 2500),
        wave(3, ["NORMAL", "CONEHEAD"], 5, 2000, { final: true }),
      ],
    },
  ],
  3: [
    "wall-nut",
    "Conehead Zombies wear traffic cones! It takes more hits to defeat them.",
    3,
    {
      finalWaveNumber: 4,
      waves: [
        wave(1, ["NORMAL"], 4, 2500),
        wave(2, ["NORMAL", "CONEHEAD"], 4, 2000),
        wave(3, ["NORMAL", "CONEHEAD"], 5, 2000),
        wave(4, ["NORMAL", "CONEHEAD"], 6, 1800, { final: true }),
      ],
    },
  ],
  4: [
    "potato-mine",
    "Wall-nuts can block zombies while your Peashooters mow them down!",
    4,
    {
      finalWaveNumber: 4,
      flagEvery: 4,
      waves: [
        wave(1, ["NORMAL"], 4, 2500),
        wave(2, ["NORMAL", "CONEHEAD"], 5, 2000),
        wave(3, ["NORMAL", "CONEHEAD"], 6, 1800),
        wave(4, ["NORMAL", "CONEHEAD"], 7, 1600, { flag: true, final: true }),
      ],
    },
  ],
  5: [
    "snow-pea",
    "The zombies are coming in waves now! A flag means a huge wave is near!",
    5,
    {
      finalWaveNumber: 5,
      flagEvery: 5,
      waves: [
        wave(1, ["NORMAL"], 4, 2500),
        wave(2, ["NORMAL", "CONEHEAD"], 5, 2000),
        wave(3, ["NORMAL", "CONEHEAD"], 6, 1800),
        wave(4, ["NORMAL", "CONEHEAD"], 7, 1600),
        wave(5, ["NORMAL", "NORMAL", "CONEHEAD"], 9, 1400, { flag: true, final: true }),
      ],
    },
  ],
  6: [
    "chomper",
    "Snow Pea slows zombies so other plants have more time to attack!",
    5,
    {
      finalWaveNumber: 5,
      flagEvery: 5,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD"], 5, 2000),
        wave(2, ["NORMAL", "CONEHEAD"], 6, 1800),
        wave(3, ["NORMAL", "CONEHEAD"], 6, 1700),
        wave(4, ["NORMAL", "CONEHEAD"], 7, 1600),
        wave(5, ["NORMAL", "CONEHEAD"], 9, 1400, { flag: true, final: true }),
      ],
    },
  ],
  7: [
    "repeater",
    "Chomper eats a zombie whole, but watch out — it needs time to digest!",
    5,
    {
      finalWaveNumber: 6,
      flagEvery: 6,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD"], 5, 2000),
        wave(2, ["NORMAL", "CONEHEAD"], 6, 1800),
        wave(3, ["NORMAL", "CONEHEAD"], 6, 1700),
        wave(4, ["NORMAL", "CONEHEAD"], 7, 1600),
        wave(5, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 5, 1800),
        wave(6, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 8, 1400, { flag: true, final: true }),
      ],
    },
  ],
  8: [
    "puff-shroom",
    "Buckethead Zombies have a lot more health. Use Wall-nuts to buy time!",
    6,
    {
      finalWaveNumber: 6,
      flagEvery: 6,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD"], 5, 2000),
        wave(2, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 5, 1800),
        wave(3, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 6, 1700),
        wave(4, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 7, 1600),
        wave(5, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 7, 1500),
        wave(6, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 9, 1300, { flag: true, final: true }),
      ],
    },
  ],
  9: [
    "sun-shroom",
    "Puff-shroom is free but disappears after a while. Use it as a distraction!",
    6,
    {
      finalWaveNumber: 7,
      flagEvery: 7,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD"], 5, 2000),
        wave(2, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 5, 1800),
        wave(3, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 6, 1700),
        wave(4, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 7, 1600),
        wave(5, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 7, 1500),
        wave(6, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 8, 1400),
        wave(7, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 10, 1200, { flag: true, final: true }),
      ],
    },
  ],
  10: [
    "fume-shroom",
    "Huge wave incoming! This is the final level of the Day. Good luck!",
    7,
    {
      finalWaveNumber: 10,
      flagEvery: 5,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD"], 5, 2000),
        wave(2, ["NORMAL", "CONEHEAD"], 6, 1800),
        wave(3, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 6, 1700),
        wave(4, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 7, 1600),
        wave(5, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 8, 1500, { flag: true }),
        wave(6, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 8, 1400),
        wave(7, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 8, 1300),
        wave(8, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 9, 1200),
        wave(9, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 9, 1100),
        wave(10, ["NORMAL", "CONEHEAD", "BUCKETHEAD"], 12, 1000, { flag: true, final: true }),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// WORLD 2 — NIGHT (Levels 11-20)
// Zombie intro: NEWSPAPER (2-1) → SCREEN_DOOR (2-4) → FOOTBALL (2-6) → DANCING (2-8)
// ---------------------------------------------------------------------------

const W2: Record<number, LC> = {
  11: [
    "scaredy-shroom",
    "It's night! Mushrooms grow stronger here. Sun falls from the sky less often.",
    5,
    {
      finalWaveNumber: 4,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD"], 4, 2500),
        wave(2, ["NORMAL", "CONEHEAD", "NEWSPAPER"], 5, 2200),
        wave(3, ["NORMAL", "CONEHEAD", "NEWSPAPER"], 6, 2000),
        wave(4, ["NORMAL", "CONEHEAD", "NEWSPAPER"], 7, 1800, { flag: true, final: true }),
      ],
    },
  ],
  12: [
    "ice-shroom",
    "Newspaper Zombies move faster when their newspaper is destroyed!",
    5,
    {
      finalWaveNumber: 5,
      flagEvery: 5,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD", "NEWSPAPER"], 4, 2500),
        wave(2, ["NORMAL", "CONEHEAD", "NEWSPAPER"], 5, 2200),
        wave(3, ["NORMAL", "CONEHEAD", "NEWSPAPER", "BUCKETHEAD"], 5, 2000),
        wave(4, ["NORMAL", "CONEHEAD", "NEWSPAPER", "BUCKETHEAD"], 6, 1800),
        wave(5, ["NORMAL", "CONEHEAD", "NEWSPAPER", "BUCKETHEAD"], 8, 1600, { flag: true, final: true }),
      ],
    },
  ],
  13: [
    "doom-shroom",
    "Ice-shroom freezes all zombies! Use it when overwhelmed to buy time!",
    6,
    {
      finalWaveNumber: 5,
      flagEvery: 5,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD", "NEWSPAPER"], 5, 2200),
        wave(2, ["NORMAL", "CONEHEAD", "NEWSPAPER", "BUCKETHEAD"], 5, 2000),
        wave(3, ["NORMAL", "CONEHEAD", "NEWSPAPER", "BUCKETHEAD"], 6, 1800),
        wave(4, ["NORMAL", "CONEHEAD", "NEWSPAPER", "BUCKETHEAD"], 7, 1700),
        wave(5, ["NORMAL", "CONEHEAD", "NEWSPAPER", "BUCKETHEAD"], 9, 1500, { flag: true, final: true }),
      ],
    },
  ],
  14: [
    "lily-pad",
    "Doom-shroom destroys everything nearby! It leaves a crater that blocks planting.",
    6,
    {
      finalWaveNumber: 5,
      flagEvery: 5,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD", "NEWSPAPER"], 5, 2000),
        wave(2, ["NORMAL", "CONEHEAD", "NEWSPAPER", "SCREEN_DOOR"], 5, 1900),
        wave(3, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD"], 6, 1800),
        wave(4, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD"], 7, 1700),
        wave(5, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD"], 9, 1500, { flag: true, final: true }),
      ],
    },
  ],
  15: [
    "squash",
    "Screen Door Zombies have strong shields — use Magnet-shroom to strip their armor!",
    6,
    {
      finalWaveNumber: 6,
      flagEvery: 6,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD", "NEWSPAPER"], 5, 2000),
        wave(2, ["NORMAL", "CONEHEAD", "SCREEN_DOOR"], 5, 1900),
        wave(3, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD"], 6, 1800),
        wave(4, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD"], 7, 1600),
        wave(5, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD"], 7, 1500),
        wave(6, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD"], 10, 1300, { flag: true, final: true }),
      ],
    },
  ],
  16: [
    "threepeater",
    "Squash squashes the nearest zombie. Perfect for emergencies!",
    6,
    {
      finalWaveNumber: 6,
      flagEvery: 6,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD", "NEWSPAPER", "SCREEN_DOOR"], 5, 2000),
        wave(2, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD"], 5, 1900),
        wave(3, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 5, 1800),
        wave(4, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 7, 1600),
        wave(5, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 8, 1500),
        wave(6, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 10, 1300, { flag: true, final: true }),
      ],
    },
  ],
  17: [
    "tangle-kelp",
    "Football Zombie is fast and armored. Use a Chomper or Cherry Bomb to stop it!",
    7,
    {
      finalWaveNumber: 7,
      flagEvery: 7,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD", "NEWSPAPER", "SCREEN_DOOR"], 5, 1900),
        wave(2, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD"], 6, 1800),
        wave(3, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 6, 1700),
        wave(4, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 7, 1600),
        wave(5, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 7, 1500),
        wave(6, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 8, 1400),
        wave(7, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 10, 1200, { flag: true, final: true }),
      ],
    },
  ],
  18: [
    "jalapeno",
    "Dancing Zombie calls backup dancers when he moonwalks onto the lawn!",
    7,
    {
      finalWaveNumber: 7,
      flagEvery: 7,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD", "NEWSPAPER", "SCREEN_DOOR"], 5, 1900),
        wave(2, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 5, 1800),
        wave(3, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 6, 1700),
        wave(4, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "DANCING"], 6, 1600),
        wave(5, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "DANCING", "FOOTBALL"], 7, 1500),
        wave(6, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "DANCING", "FOOTBALL"], 8, 1400),
        wave(7, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "DANCING", "FOOTBALL"], 10, 1200, { flag: true, final: true }),
      ],
    },
  ],
  19: [
    "spikeweed",
    "Jalapeno burns an entire lane! Great for clearing out groups of zombies!",
    7,
    {
      finalWaveNumber: 8,
      flagEvery: 8,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD", "SCREEN_DOOR"], 5, 1900),
        wave(2, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD"], 6, 1800),
        wave(3, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "DANCING"], 6, 1700),
        wave(4, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "DANCING", "FOOTBALL"], 7, 1600),
        wave(5, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "DANCING", "FOOTBALL"], 7, 1500),
        wave(6, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "DANCING", "FOOTBALL"], 8, 1400),
        wave(7, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "DANCING", "FOOTBALL"], 9, 1300),
        wave(8, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "DANCING", "FOOTBALL"], 12, 1100, { flag: true, final: true }),
      ],
    },
  ],
  20: [
    "torchwood",
    "Final night level! The zombies will give everything they've got!",
    8,
    {
      finalWaveNumber: 10,
      flagEvery: 5,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD", "SCREEN_DOOR"], 5, 1900),
        wave(2, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD"], 6, 1800),
        wave(3, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 6, 1700),
        wave(4, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL"], 7, 1600),
        wave(5, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL", "DANCING"], 8, 1500, { flag: true }),
        wave(6, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL", "DANCING"], 8, 1400),
        wave(7, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL", "DANCING"], 9, 1300),
        wave(8, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL", "DANCING"], 9, 1200),
        wave(9, ["NORMAL", "CONEHEAD", "SCREEN_DOOR", "BUCKETHEAD", "FOOTBALL", "DANCING"], 10, 1100),
        wave(10, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "DANCING"], 14, 1000, { flag: true, final: true }),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// WORLD 3 — POOL (Levels 21-30)
// Zombie intro: DUCKY_TUBE (3-1) → SNORKEL (3-2) → DOLPHIN_RIDER (3-3)
//               → ZOMBONI (3-7) → BOBSLED (3-8) → CATAPULT (3-9)
// ---------------------------------------------------------------------------

const POOL_LAND = ["NORMAL", "CONEHEAD", "BUCKETHEAD", "NEWSPAPER"];
const POOL_WATER = ["DUCKY_TUBE", "SNORKEL"];
const POOL_MIX = [...POOL_LAND, ...POOL_WATER];

const W3: Record<number, LC> = {
  21: [
    "tall-nut",
    "Welcome to the Pool! Zombies can swim now. Use Lily Pad to plant on water.",
    6,
    {
      finalWaveNumber: 5,
      flagEvery: 5,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD", "DUCKY_TUBE"], 5, 2000),
        wave(2, ["NORMAL", "CONEHEAD", "DUCKY_TUBE"], 6, 1900),
        wave(3, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "DUCKY_TUBE"], 7, 1800),
        wave(4, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "DUCKY_TUBE"], 7, 1700),
        wave(5, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "DUCKY_TUBE"], 9, 1500, { flag: true, final: true }),
      ],
    },
  ],
  22: [
    "sea-shroom",
    "Snorkel Zombie submerges in water to dodge your plants. Sea-shroom can hit them!",
    6,
    {
      finalWaveNumber: 6,
      flagEvery: 6,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD", "DUCKY_TUBE", "SNORKEL"], 5, 2000),
        wave(2, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "DUCKY_TUBE", "SNORKEL"], 6, 1900),
        wave(3, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "DUCKY_TUBE", "SNORKEL"], 6, 1800),
        wave(4, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "DUCKY_TUBE", "SNORKEL"], 7, 1700),
        wave(5, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "DUCKY_TUBE", "SNORKEL"], 8, 1600),
        wave(6, [..."NORMAL,CONEHEAD,BUCKETHEAD,DUCKY_TUBE,SNORKEL".split(",")], 10, 1400, { flag: true, final: true }),
      ],
    },
  ],
  23: [
    "plantern",
    "Dolphin Rider jumps over one plant! Place Wall-nuts behind your front row!",
    7,
    {
      finalWaveNumber: 6,
      flagEvery: 6,
      waves: [
        wave(1, ["NORMAL", "CONEHEAD", "DUCKY_TUBE", "SNORKEL"], 5, 2000),
        wave(2, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "DUCKY_TUBE", "DOLPHIN_RIDER"], 6, 1900),
        wave(3, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "DUCKY_TUBE", "DOLPHIN_RIDER", "SNORKEL"], 6, 1800),
        wave(4, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "DUCKY_TUBE", "DOLPHIN_RIDER", "SNORKEL"], 7, 1700),
        wave(5, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "DUCKY_TUBE", "DOLPHIN_RIDER"], 8, 1600),
        wave(6, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "DUCKY_TUBE", "DOLPHIN_RIDER", "SNORKEL"], 10, 1400, { flag: true, final: true }),
      ],
    },
  ],
  24: [
    "cactus",
    "Cactus can shoot down Balloon Zombies — watch the skies in later levels!",
    7,
    {
      finalWaveNumber: 7,
      flagEvery: 7,
      waves: [
        wave(1, [...POOL_MIX], 5, 1900),
        wave(2, [...POOL_MIX, "DOLPHIN_RIDER"], 6, 1800),
        wave(3, [...POOL_MIX, "DOLPHIN_RIDER", "FOOTBALL"], 6, 1700),
        wave(4, [...POOL_MIX, "DOLPHIN_RIDER", "FOOTBALL"], 7, 1600),
        wave(5, [...POOL_MIX, "DOLPHIN_RIDER", "FOOTBALL", "SCREEN_DOOR"], 8, 1500),
        wave(6, [...POOL_MIX, "DOLPHIN_RIDER", "FOOTBALL", "SCREEN_DOOR"], 9, 1400),
        wave(7, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "DOLPHIN_RIDER", "SCREEN_DOOR"], 11, 1300, { flag: true, final: true }),
      ],
    },
  ],
  25: [
    "blover",
    "Blover blows away all aerial zombies — and clears the fog too!",
    7,
    {
      finalWaveNumber: 7,
      flagEvery: 7,
      waves: [
        wave(1, [...POOL_MIX], 6, 1900),
        wave(2, [...POOL_MIX, "DOLPHIN_RIDER", "FOOTBALL"], 6, 1800),
        wave(3, [...POOL_MIX, "DOLPHIN_RIDER", "FOOTBALL", "SCREEN_DOOR"], 7, 1700),
        wave(4, [...POOL_MIX, "DOLPHIN_RIDER", "FOOTBALL", "SCREEN_DOOR"], 7, 1600),
        wave(5, [...POOL_MIX, "DOLPHIN_RIDER", "FOOTBALL", "SCREEN_DOOR"], 8, 1500),
        wave(6, [...POOL_MIX, "DOLPHIN_RIDER", "FOOTBALL", "SCREEN_DOOR"], 9, 1400),
        wave(7, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "DOLPHIN_RIDER", "SCREEN_DOOR"], 11, 1200, { flag: true, final: true }),
      ],
    },
  ],
  26: [
    "split-pea",
    "Split Pea shoots forward AND backward — great for dealing with diggers!",
    7,
    {
      finalWaveNumber: 8,
      flagEvery: 8,
      waves: [
        wave(1, [...POOL_MIX, "FOOTBALL"], 6, 1800),
        wave(2, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR"], 6, 1700),
        wave(3, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR"], 7, 1700),
        wave(4, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR"], 7, 1600),
        wave(5, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "DANCING"], 8, 1500),
        wave(6, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "DANCING"], 9, 1400),
        wave(7, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "DANCING"], 9, 1300),
        wave(8, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "DANCING", "SCREEN_DOOR"], 12, 1200, { flag: true, final: true }),
      ],
    },
  ],
  27: [
    "starfruit",
    "Zomboni drives over your plants! Use Spikeweed to stop it!",
    7,
    {
      finalWaveNumber: 8,
      flagEvery: 8,
      waves: [
        wave(1, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR"], 6, 1800),
        wave(2, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI"], 6, 1700),
        wave(3, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI"], 7, 1700),
        wave(4, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI"], 7, 1600),
        wave(5, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI", "DANCING"], 8, 1500),
        wave(6, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI", "DANCING"], 9, 1400),
        wave(7, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI", "DANCING"], 9, 1300),
        wave(8, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "ZOMBONI", "DANCING"], 12, 1100, { flag: true, final: true }),
      ],
    },
  ],
  28: [
    "pumpkin",
    "Bobsled teams slide in on Zomboni ice! Melt the ice with Jalapeno!",
    7,
    {
      finalWaveNumber: 9,
      flagEvery: 9,
      waves: [
        wave(1, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR"], 6, 1800),
        wave(2, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI"], 6, 1700),
        wave(3, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI", "BOBSLED"], 7, 1700),
        wave(4, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI", "BOBSLED"], 7, 1600),
        wave(5, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI", "BOBSLED", "DANCING"], 8, 1500),
        wave(6, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI", "BOBSLED", "DANCING"], 8, 1400),
        wave(7, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI", "BOBSLED", "DANCING"], 9, 1300),
        wave(8, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "ZOMBONI", "BOBSLED", "DANCING"], 9, 1200),
        wave(9, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "ZOMBONI", "BOBSLED", "DANCING"], 13, 1100, { flag: true, final: true }),
      ],
    },
  ],
  29: [
    "magnet-shroom",
    "Catapult Zombie launches basketballs at your plants! Umbrella Leaf protects them!",
    7,
    {
      finalWaveNumber: 9,
      flagEvery: 9,
      waves: [
        wave(1, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "CATAPULT"], 6, 1800),
        wave(2, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR", "CATAPULT", "ZOMBONI"], 7, 1700),
        wave(3, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI", "BOBSLED"], 7, 1700),
        wave(4, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI", "BOBSLED"], 7, 1600),
        wave(5, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI", "BOBSLED", "DANCING"], 8, 1500),
        wave(6, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI", "BOBSLED", "DANCING"], 9, 1400),
        wave(7, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI", "BOBSLED", "DANCING"], 9, 1300),
        wave(8, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI", "BOBSLED", "DANCING"], 10, 1200),
        wave(9, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "CATAPULT", "ZOMBONI", "DANCING"], 14, 1000, { flag: true, final: true }),
      ],
    },
  ],
  30: [
    "cabbage-pult",
    "Final pool level! Catapults, Zomboni, and every pool zombie will attack!",
    8,
    {
      finalWaveNumber: 10,
      flagEvery: 5,
      waves: [
        wave(1, [...POOL_MIX, "FOOTBALL", "SCREEN_DOOR"], 6, 1800),
        wave(2, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI"], 7, 1700),
        wave(3, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI", "BOBSLED"], 7, 1600),
        wave(4, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI", "BOBSLED", "DANCING"], 8, 1600),
        wave(5, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI", "BOBSLED", "DANCING"], 9, 1500, { flag: true }),
        wave(6, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI", "BOBSLED", "DANCING"], 9, 1400),
        wave(7, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI", "BOBSLED"], 10, 1300),
        wave(8, [...POOL_MIX, "FOOTBALL", "CATAPULT", "ZOMBONI", "BOBSLED", "DANCING"], 10, 1200),
        wave(9, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "CATAPULT", "ZOMBONI", "DANCING"], 11, 1100),
        wave(10, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "CATAPULT", "ZOMBONI", "DANCING"], 14, 1000, { flag: true, final: true }),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// WORLD 4 — FOG (Levels 31-40)
// Zombie intro: JACK_IN_THE_BOX (4-3) → BALLOON (4-6) → DIGGER (4-7) → POGO (4-8) → LADDER (4-9) → GARGANTUAR (4-10)
// ---------------------------------------------------------------------------

const FOG_BASE = ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "NEWSPAPER"];
const FOG_WATER = ["DUCKY_TUBE", "SNORKEL", "DOLPHIN_RIDER"];

const W4: Record<number, LC> = {
  31: [
    "flower-pot",
    "Fog hides most of the lawn! Plantern clears fog around it. Keep your eyes open!",
    7,
    {
      finalWaveNumber: 7,
      flagEvery: 7,
      waves: [
        wave(1, [...FOG_BASE], 6, 1800),
        wave(2, [...FOG_BASE, ...FOG_WATER], 7, 1700),
        wave(3, [...FOG_BASE, ...FOG_WATER], 7, 1700),
        wave(4, [...FOG_BASE, ...FOG_WATER, "DANCING"], 7, 1600),
        wave(5, [...FOG_BASE, ...FOG_WATER, "DANCING"], 8, 1500),
        wave(6, [...FOG_BASE, ...FOG_WATER, "DANCING", "CATAPULT"], 9, 1400),
        wave(7, [...FOG_BASE, "FOOTBALL", "DANCING", "CATAPULT"], 12, 1200, { flag: true, final: true }),
      ],
    },
  ],
  32: [
    "kernel-pult",
    "Kernel-pult launches corn! Butter slows zombies and turns them golden!",
    7,
    {
      finalWaveNumber: 8,
      flagEvery: 8,
      waves: [
        wave(1, [...FOG_BASE, ...FOG_WATER], 6, 1800),
        wave(2, [...FOG_BASE, ...FOG_WATER, "DANCING"], 7, 1700),
        wave(3, [...FOG_BASE, ...FOG_WATER, "DANCING", "CATAPULT"], 7, 1700),
        wave(4, [...FOG_BASE, ...FOG_WATER, "DANCING", "CATAPULT", "ZOMBONI"], 8, 1600),
        wave(5, [...FOG_BASE, ...FOG_WATER, "DANCING", "CATAPULT", "ZOMBONI"], 8, 1500),
        wave(6, [...FOG_BASE, ...FOG_WATER, "DANCING", "CATAPULT", "ZOMBONI"], 9, 1400),
        wave(7, [...FOG_BASE, ...FOG_WATER, "DANCING", "CATAPULT", "ZOMBONI"], 10, 1300),
        wave(8, [...FOG_BASE, "FOOTBALL", "DANCING", "CATAPULT", "ZOMBONI"], 13, 1100, { flag: true, final: true }),
      ],
    },
  ],
  33: [
    "coffee-bean",
    "Jack-in-the-Box Zombie can explode! It's unpredictable — take it out fast!",
    7,
    {
      finalWaveNumber: 8,
      flagEvery: 8,
      waves: [
        wave(1, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX"], 6, 1800),
        wave(2, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING"], 7, 1700),
        wave(3, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT"], 7, 1700),
        wave(4, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT"], 8, 1600),
        wave(5, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 8, 1500),
        wave(6, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 9, 1400),
        wave(7, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 10, 1300),
        wave(8, [...FOG_BASE, "FOOTBALL", "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 13, 1100, { flag: true, final: true }),
      ],
    },
  ],
  34: [
    "garlic",
    "Garlic diverts zombies to other lanes — use it to redirect threats!",
    7,
    {
      finalWaveNumber: 9,
      flagEvery: 9,
      waves: [
        wave(1, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX"], 7, 1800),
        wave(2, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING"], 7, 1700),
        wave(3, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT"], 8, 1700),
        wave(4, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 8, 1600),
        wave(5, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 9, 1500),
        wave(6, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 9, 1400),
        wave(7, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 10, 1300),
        wave(8, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 10, 1200),
        wave(9, [...FOG_BASE, "FOOTBALL", "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 14, 1000, { flag: true, final: true }),
      ],
    },
  ],
  35: [
    "umbrella-leaf",
    "Umbrella Leaf protects nearby plants from catapult and bungee attacks!",
    7,
    {
      finalWaveNumber: 9,
      flagEvery: 9,
      waves: [
        wave(1, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX"], 7, 1800),
        wave(2, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT"], 7, 1700),
        wave(3, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 8, 1700),
        wave(4, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 8, 1600),
        wave(5, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI", "BOBSLED"], 9, 1500),
        wave(6, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI", "BOBSLED"], 9, 1400),
        wave(7, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI", "BOBSLED"], 10, 1300),
        wave(8, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI", "BOBSLED"], 10, 1200),
        wave(9, [...FOG_BASE, "FOOTBALL", "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI", "BOBSLED"], 14, 1000, { flag: true, final: true }),
      ],
    },
  ],
  36: [
    "marigold",
    "Balloon Zombie floats over your ground plants! Only aerial shooters can hit them!",
    7,
    {
      finalWaveNumber: 9,
      flagEvery: 9,
      waves: [
        wave(1, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON"], 7, 1800),
        wave(2, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DANCING"], 7, 1700),
        wave(3, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DANCING", "CATAPULT"], 8, 1700),
        wave(4, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DANCING", "CATAPULT", "ZOMBONI"], 8, 1600),
        wave(5, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DANCING", "CATAPULT", "ZOMBONI"], 9, 1500),
        wave(6, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DANCING", "CATAPULT", "ZOMBONI", "BOBSLED"], 9, 1400),
        wave(7, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DANCING", "CATAPULT", "ZOMBONI", "BOBSLED"], 10, 1300),
        wave(8, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DANCING", "CATAPULT", "ZOMBONI", "BOBSLED"], 10, 1200),
        wave(9, [...FOG_BASE, "FOOTBALL", "BALLOON", "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI", "BOBSLED"], 15, 1000, { flag: true, final: true }),
      ],
    },
  ],
  37: [
    "melon-pult",
    "Digger Zombie tunnels underground! Split Pea can shoot backward to stop them!",
    7,
    {
      finalWaveNumber: 10,
      flagEvery: 5,
      waves: [
        wave(1, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER"], 7, 1800),
        wave(2, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "DANCING"], 7, 1700),
        wave(3, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "DANCING", "CATAPULT"], 8, 1700),
        wave(4, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "DANCING", "CATAPULT"], 8, 1600),
        wave(5, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "DANCING", "CATAPULT", "ZOMBONI"], 9, 1500, { flag: true }),
        wave(6, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "DANCING", "CATAPULT", "ZOMBONI"], 9, 1400),
        wave(7, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "DANCING", "CATAPULT", "ZOMBONI", "BOBSLED"], 10, 1300),
        wave(8, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "DANCING", "CATAPULT", "ZOMBONI", "BOBSLED"], 10, 1200),
        wave(9, [...FOG_BASE, "FOOTBALL", "BALLOON", "DIGGER", "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI", "BOBSLED"], 11, 1100),
        wave(10, [...FOG_BASE, "FOOTBALL", "BALLOON", "DIGGER", "JACK_IN_THE_BOX", "DANCING", "CATAPULT", "ZOMBONI"], 16, 1000, { flag: true, final: true }),
      ],
    },
  ],
  38: [
    null,
    "Pogo Zombie leaps over your Wall-nuts! Tall-nut stops them cold!",
    7,
    {
      finalWaveNumber: 10,
      flagEvery: 5,
      waves: [
        wave(1, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO"], 7, 1800),
        wave(2, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "DANCING"], 7, 1700),
        wave(3, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "CATAPULT"], 8, 1700),
        wave(4, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "CATAPULT", "ZOMBONI"], 8, 1600),
        wave(5, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "CATAPULT", "ZOMBONI", "DANCING"], 9, 1500, { flag: true }),
        wave(6, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "CATAPULT", "ZOMBONI", "DANCING"], 9, 1400),
        wave(7, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "CATAPULT", "ZOMBONI", "DANCING", "BOBSLED"], 10, 1300),
        wave(8, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "CATAPULT", "ZOMBONI", "BOBSLED"], 10, 1200),
        wave(9, [...FOG_BASE, "FOOTBALL", "BALLOON", "DIGGER", "POGO", "JACK_IN_THE_BOX", "CATAPULT", "ZOMBONI", "BOBSLED"], 11, 1100),
        wave(10, [...FOG_BASE, "FOOTBALL", "BALLOON", "DIGGER", "POGO", "DANCING", "CATAPULT", "ZOMBONI"], 17, 1000, { flag: true, final: true }),
      ],
    },
  ],
  39: [
    null,
    "Ladder Zombie places a ladder to climb over Wall-nuts! Use a Tall-nut or destroy it!",
    8,
    {
      finalWaveNumber: 11,
      flagEvery: 5,
      waves: [
        wave(1, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER"], 7, 1800),
        wave(2, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "DANCING"], 7, 1700),
        wave(3, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "CATAPULT"], 8, 1700),
        wave(4, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "CATAPULT", "ZOMBONI"], 8, 1600),
        wave(5, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "CATAPULT", "ZOMBONI", "DANCING"], 9, 1500, { flag: true }),
        wave(6, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "CATAPULT", "ZOMBONI", "DANCING"], 9, 1400),
        wave(7, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "CATAPULT", "ZOMBONI", "DANCING", "BOBSLED"], 10, 1300),
        wave(8, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "CATAPULT", "ZOMBONI", "BOBSLED"], 10, 1200),
        wave(9, [...FOG_BASE, "FOOTBALL", "BALLOON", "DIGGER", "POGO", "LADDER", "JACK_IN_THE_BOX", "CATAPULT", "ZOMBONI", "BOBSLED"], 11, 1100),
        wave(10, [...FOG_BASE, "FOOTBALL", "BALLOON", "DIGGER", "POGO", "LADDER", "DANCING", "CATAPULT", "ZOMBONI"], 12, 1000),
        wave(11, [...FOG_BASE, "FOOTBALL", "BALLOON", "DIGGER", "POGO", "LADDER", "DANCING", "CATAPULT", "ZOMBONI"], 17, 900, { flag: true, final: true }),
      ],
    },
  ],
  40: [
    null,
    "Gargantuar is almost unstoppable! Use instant plants like Cherry Bomb and Ice-shroom!",
    8,
    {
      finalWaveNumber: 12,
      flagEvery: 5,
      waves: [
        wave(1, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "LADDER"], 7, 1800),
        wave(2, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER"], 8, 1700),
        wave(3, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "CATAPULT"], 8, 1700),
        wave(4, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "CATAPULT", "ZOMBONI"], 9, 1600),
        wave(5, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "CATAPULT", "ZOMBONI", "DANCING"], 9, 1500, { flag: true }),
        wave(6, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "CATAPULT", "ZOMBONI", "DANCING"], 10, 1400),
        wave(7, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "CATAPULT", "ZOMBONI", "DANCING", "BOBSLED"], 10, 1300),
        wave(8, [...FOG_BASE, ...FOG_WATER, "JACK_IN_THE_BOX", "BALLOON", "DIGGER", "POGO", "LADDER", "CATAPULT", "ZOMBONI", "BOBSLED", "GARGANTUAR"], 8, 1200),
        wave(9, [...FOG_BASE, "FOOTBALL", "BALLOON", "DIGGER", "POGO", "LADDER", "JACK_IN_THE_BOX", "CATAPULT", "ZOMBONI", "GARGANTUAR"], 9, 1100),
        wave(10, [...FOG_BASE, "FOOTBALL", "BALLOON", "DIGGER", "POGO", "LADDER", "DANCING", "CATAPULT", "ZOMBONI", "GARGANTUAR"], 10, 1000, { flag: true }),
        wave(11, [...FOG_BASE, "FOOTBALL", "BALLOON", "DIGGER", "POGO", "LADDER", "DANCING", "CATAPULT", "ZOMBONI", "GARGANTUAR"], 11, 900),
        wave(12, [...FOG_BASE, "FOOTBALL", "BALLOON", "POGO", "LADDER", "DANCING", "GARGANTUAR", "ZOMBONI"], 18, 800, { flag: true, final: true }),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// WORLD 5 — ROOF (Levels 41-50)
// Zombie intro: BUNGEE from 5-1 onwards, all previous types
// Only lobbed plants (Cabbage-pult, Kernel-pult, Melon-pult) can shoot on slope
// ---------------------------------------------------------------------------

const ROOF_POOL = [
  "NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR",
  "NEWSPAPER", "LADDER", "POGO", "DANCING", "JACK_IN_THE_BOX",
  "BALLOON", "CATAPULT", "BUNGEE",
];

const W5: Record<number, LC> = {
  41: [
    null,
    "You're on the roof! Only lobbed plants can shoot over the slope. Flower Pot is your foundation!",
    7,
    {
      finalWaveNumber: 8,
      flagEvery: 8,
      waves: [
        wave(1, [...ROOF_POOL.slice(0, 5), "BUNGEE"], 6, 1800),
        wave(2, [...ROOF_POOL.slice(0, 7), "BUNGEE"], 7, 1700),
        wave(3, [...ROOF_POOL.slice(0, 8), "BUNGEE"], 7, 1700),
        wave(4, [...ROOF_POOL, "ZOMBONI"], 8, 1600),
        wave(5, [...ROOF_POOL, "ZOMBONI"], 8, 1500),
        wave(6, [...ROOF_POOL, "ZOMBONI", "GARGANTUAR"], 7, 1400),
        wave(7, [...ROOF_POOL, "ZOMBONI", "GARGANTUAR"], 8, 1300),
        wave(8, [...ROOF_POOL, "ZOMBONI", "GARGANTUAR"], 14, 1100, { flag: true, final: true }),
      ],
    },
  ],
  42: [
    null,
    "Bungee Zombie drops from the sky and steals your plants! Umbrella Leaf protects them!",
    7,
    {
      finalWaveNumber: 9,
      flagEvery: 9,
      waves: [
        wave(1, [...ROOF_POOL, "ZOMBONI"], 7, 1800),
        wave(2, [...ROOF_POOL, "ZOMBONI", "BOBSLED"], 7, 1700),
        wave(3, [...ROOF_POOL, "ZOMBONI", "BOBSLED"], 8, 1700),
        wave(4, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 7, 1600),
        wave(5, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 8, 1500),
        wave(6, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 8, 1400),
        wave(7, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 9, 1300),
        wave(8, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 10, 1200),
        wave(9, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 15, 1000, { flag: true, final: true }),
      ],
    },
  ],
  43: [
    null,
    "Gargantuar smashes your plants and throws an Imp when damaged! Target it first!",
    7,
    {
      finalWaveNumber: 9,
      flagEvery: 9,
      waves: [
        wave(1, [...ROOF_POOL, "ZOMBONI", "BOBSLED"], 7, 1800),
        wave(2, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 7, 1700),
        wave(3, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 8, 1700),
        wave(4, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 8, 1600),
        wave(5, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 9, 1500),
        wave(6, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 9, 1400),
        wave(7, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 10, 1300),
        wave(8, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 11, 1200),
        wave(9, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 16, 1000, { flag: true, final: true }),
      ],
    },
  ],
  44: [
    null,
    "Stack Melon-pults behind Kernel-pults — the area damage decimates groups!",
    7,
    {
      finalWaveNumber: 10,
      flagEvery: 5,
      waves: [
        wave(1, [...ROOF_POOL, "ZOMBONI", "BOBSLED"], 7, 1800),
        wave(2, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 7, 1700),
        wave(3, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 8, 1700),
        wave(4, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 8, 1600),
        wave(5, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 9, 1500, { flag: true }),
        wave(6, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 9, 1400),
        wave(7, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 10, 1300),
        wave(8, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 11, 1200),
        wave(9, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 12, 1100),
        wave(10, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "GARGANTUAR"], 17, 900, { flag: true, final: true }),
      ],
    },
  ],
  45: [
    null,
    "Halfway through the roof! Cover all 5 lanes — Garlic can redirect to safer lanes!",
    7,
    {
      finalWaveNumber: 10,
      flagEvery: 5,
      waves: [
        wave(1, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER"], 7, 1800),
        wave(2, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 7, 1700),
        wave(3, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 8, 1700),
        wave(4, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 8, 1600),
        wave(5, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 9, 1500, { flag: true }),
        wave(6, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 9, 1400),
        wave(7, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 10, 1300),
        wave(8, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 11, 1200),
        wave(9, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 12, 1100),
        wave(10, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 18, 900, { flag: true, final: true }),
      ],
    },
  ],
  46: [
    null,
    "The zombie assault is relentless! Stack your defenses deep into the yard!",
    8,
    {
      finalWaveNumber: 12,
      flagEvery: 5,
      waves: [
        wave(1, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 7, 1800),
        wave(2, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 8, 1700),
        wave(3, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 8, 1700),
        wave(4, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 9, 1600),
        wave(5, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 9, 1500, { flag: true }),
        wave(6, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 10, 1400),
        wave(7, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 10, 1300),
        wave(8, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 11, 1200),
        wave(9, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 11, 1100),
        wave(10, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 12, 1000, { flag: true }),
        wave(11, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 13, 900),
        wave(12, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 19, 800, { flag: true, final: true }),
      ],
    },
  ],
  47: [
    null,
    "Catapult zombies target your highest-value plants from far away! Protect them!",
    8,
    {
      finalWaveNumber: 12,
      flagEvery: 5,
      waves: [
        wave(1, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 8, 1700),
        wave(2, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 8, 1700),
        wave(3, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 9, 1600),
        wave(4, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 9, 1600),
        wave(5, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 10, 1500, { flag: true }),
        wave(6, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 10, 1400),
        wave(7, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 11, 1300),
        wave(8, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 11, 1200),
        wave(9, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 12, 1100),
        wave(10, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 12, 1000, { flag: true }),
        wave(11, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 13, 900),
        wave(12, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 20, 800, { flag: true, final: true }),
      ],
    },
  ],
  48: [
    null,
    "Almost at the end! Every zombie type is attacking — prepare for anything!",
    8,
    {
      finalWaveNumber: 13,
      flagEvery: 5,
      waves: [
        wave(1, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 8, 1700),
        wave(2, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 9, 1700),
        wave(3, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 9, 1600),
        wave(4, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 10, 1600),
        wave(5, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 10, 1500, { flag: true }),
        wave(6, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 11, 1400),
        wave(7, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 11, 1300),
        wave(8, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 12, 1200),
        wave(9, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 12, 1100),
        wave(10, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 13, 1000, { flag: true }),
        wave(11, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 13, 900),
        wave(12, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 14, 800),
        wave(13, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 22, 700, { flag: true, final: true }),
      ],
    },
  ],
  49: [
    null,
    "One level from the end! Gargantuars will attack in force. Survival of the fittest!",
    8,
    {
      finalWaveNumber: 15,
      flagEvery: 5,
      waves: [
        wave(1, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 9, 1700),
        wave(2, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 10, 1600),
        wave(3, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 10, 1600),
        wave(4, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 11, 1500),
        wave(5, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 11, 1500, { flag: true }),
        wave(6, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 12, 1400),
        wave(7, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 12, 1300),
        wave(8, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 13, 1200),
        wave(9, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 13, 1100),
        wave(10, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 14, 1000, { flag: true }),
        wave(11, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 14, 900),
        wave(12, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 15, 800),
        wave(13, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 15, 800),
        wave(14, [...ROOF_POOL, "ZOMBONI", "BOBSLED", "DIGGER", "GARGANTUAR"], 16, 700),
        wave(15, ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT"], 25, 700, { flag: true, final: true }),
      ],
    },
  ],
  50: [
    null,
    "Dr. Zomboss is here! The final battle for your brain begins now. Good luck!",
    9,
    {
      finalWaveNumber: 20,
      flagEvery: 5,
      defaultZombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING"],
      waves: [
        { waveNumber: 1,  zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "BUNGEE", "GARGANTUAR"], count: 8,  intervalMs: 1700 },
        { waveNumber: 2,  zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "LADDER", "BUNGEE", "GARGANTUAR"], count: 9,  intervalMs: 1600 },
        { waveNumber: 3,  zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR"], count: 9, intervalMs: 1600 },
        { waveNumber: 4,  zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT"], count: 10, intervalMs: 1500 },
        { waveNumber: 5,  zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT"], count: 12, intervalMs: 1400, flag: true },
        { waveNumber: 6,  zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON"], count: 11, intervalMs: 1400 },
        { waveNumber: 7,  zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING"], count: 11, intervalMs: 1300 },
        { waveNumber: 8,  zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING"], count: 12, intervalMs: 1300 },
        { waveNumber: 9,  zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING", "ZOMBONI"], count: 12, intervalMs: 1200 },
        { waveNumber: 10, zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING", "ZOMBONI"], count: 14, intervalMs: 1200, flag: true },
        { waveNumber: 11, zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING", "ZOMBONI", "BOBSLED"], count: 13, intervalMs: 1100 },
        { waveNumber: 12, zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING", "ZOMBONI", "BOBSLED", "DIGGER"], count: 13, intervalMs: 1100 },
        { waveNumber: 13, zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING", "ZOMBONI", "BOBSLED", "DIGGER", "POGO"], count: 14, intervalMs: 1000 },
        { waveNumber: 14, zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING", "ZOMBONI", "BOBSLED", "DIGGER", "POGO"], count: 14, intervalMs: 1000 },
        { waveNumber: 15, zombiePool: ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING", "ZOMBONI", "BOBSLED", "DIGGER", "POGO"], count: 15, intervalMs: 900, flag: true },
        { waveNumber: 16, zombiePool: ["CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING", "ZOMBONI", "GARGANTUAR"], count: 14, intervalMs: 900 },
        { waveNumber: 17, zombiePool: ["CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING", "ZOMBONI", "GARGANTUAR"], count: 15, intervalMs: 800 },
        { waveNumber: 18, zombiePool: ["CONEHEAD", "BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "BALLOON", "DANCING", "ZOMBONI", "GARGANTUAR"], count: 15, intervalMs: 800 },
        { waveNumber: 19, zombiePool: ["BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "BUNGEE", "GARGANTUAR", "CATAPULT", "GARGANTUAR"], count: 16, intervalMs: 700 },
        { waveNumber: 20, zombiePool: ["BUCKETHEAD", "FOOTBALL", "SCREEN_DOOR", "LADDER", "GARGANTUAR", "GARGANTUAR", "BUNGEE", "CATAPULT", "BALLOON"], count: 25, intervalMs: 600, flag: true, final: true },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Merge all worlds into the export
// ---------------------------------------------------------------------------

type LevelConfigEntry = {
  rewardPlantId: string | null;
  briefingText: string | null;
  seedSlots: number;
  waveConfig: object;
};

function toLevelConfig(tuple: LC): LevelConfigEntry {
  return {
    rewardPlantId: tuple[0],
    briefingText: tuple[1],
    seedSlots: tuple[2],
    waveConfig: tuple[3],
  };
}

const allWorlds = { ...W1, ...W2, ...W3, ...W4, ...W5 };

export const LEVEL_CONFIGS: Record<number, LevelConfigEntry> = Object.fromEntries(
  Object.entries(allWorlds).map(([k, v]) => [Number(k), toLevelConfig(v as LC)])
);
