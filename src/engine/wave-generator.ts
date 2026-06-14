export interface WaveEntry {
  zombieType: string;
  lane: number;
  spawnAtMs: number; // relative to wave start
}

const PROGRESSION: string[][] = [
  ["NORMAL"],                                         // waves 1-2
  ["NORMAL", "CONEHEAD"],                             // waves 3-4
  ["NORMAL", "CONEHEAD", "BUCKETHEAD"],               // waves 5-6
  ["NORMAL", "CONEHEAD", "BUCKETHEAD", "NEWSPAPER"],  // waves 7-9
  ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "NEWSPAPER"], // waves 10+
];

function availableTypes(wave: number): string[] {
  if (wave <= 2) return PROGRESSION[0];
  if (wave <= 4) return PROGRESSION[1];
  if (wave <= 6) return PROGRESSION[2];
  if (wave <= 9) return PROGRESSION[3];
  return PROGRESSION[4];
}

/** Generate a wave of zombie spawn entries (spawnAtMs is relative to wave start). */
export function generateWave(waveNumber: number, gridRows: number): WaveEntry[] {
  const types = availableTypes(waveNumber);
  const count = Math.min(3 + waveNumber * 2, 20);
  const entries: WaveEntry[] = [];

  for (let i = 0; i < count; i++) {
    entries.push({
      zombieType: types[Math.floor(Math.random() * types.length)],
      lane: Math.floor(Math.random() * gridRows),
      spawnAtMs: i * 1500,
    });
  }

  // Flag zombie at end of every 5th wave
  if (waveNumber % 5 === 0) {
    entries.push({
      zombieType: "FLAG",
      lane: Math.floor(Math.random() * gridRows),
      spawnAtMs: count * 1500 + 500,
    });
  }

  return entries;
}
