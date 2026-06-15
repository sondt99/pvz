import { DEFAULT_RNG_SEED, nextRandomValue, normalizeRngState } from "./rng";

export interface WaveEntry {
  zombieType: string;
  lane: number;
  spawnAtMs: number; // relative to wave start
  x?: number;
}

export interface ConfiguredWaveEntry {
  zombieType: string;
  lane?: number | number[] | "random";
  spawnAtMs?: number;
  x?: number;
}

export interface ConfiguredWave {
  waveNumber?: number;
  entries?: ConfiguredWaveEntry[];
  zombiePool?: string[];
  zombieTypes?: string[];
  count?: number;
  intervalMs?: number;
  startDelayMs?: number;
  flag?: boolean;
  final?: boolean;
}

export interface WaveConfig {
  waves: ConfiguredWave[];
  finalWaveNumber?: number;
  flagEvery?: number;
  defaultZombiePool?: string[];
}

export interface GeneratedWave {
  entries: WaveEntry[];
  rngState: number;
  isFlagWave: boolean;
  isFinalWave: boolean;
}

const DEFAULT_FINAL_WAVE_NUMBER = 5;
const DEFAULT_FLAG_EVERY = 5;
const DEFAULT_SPAWN_INTERVAL_MS = 4500;
const MAX_CONFIGURED_WAVE_COUNT = 60;

const PROGRESSION: string[][] = [
  ["NORMAL"],
  ["NORMAL", "CONEHEAD"],
  ["NORMAL", "CONEHEAD", "BUCKETHEAD"],
  ["NORMAL", "CONEHEAD", "BUCKETHEAD", "NEWSPAPER"],
  ["NORMAL", "CONEHEAD", "BUCKETHEAD", "FOOTBALL", "NEWSPAPER"],
];

function availableTypes(wave: number): string[] {
  if (wave <= 2) return PROGRESSION[0];
  if (wave <= 4) return PROGRESSION[1];
  if (wave <= 6) return PROGRESSION[2];
  if (wave <= 9) return PROGRESSION[3];
  return PROGRESSION[4];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function nonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  return list.length > 0 ? list : undefined;
}

function parseWaveEntry(value: unknown): ConfiguredWaveEntry | null {
  if (!isRecord(value) || typeof value.zombieType !== "string") return null;

  const entry: ConfiguredWaveEntry = { zombieType: value.zombieType };
  if (typeof value.lane === "number" && Number.isInteger(value.lane)) {
    entry.lane = value.lane;
  } else if (value.lane === "random") {
    entry.lane = "random";
  } else if (Array.isArray(value.lane)) {
    const lanes = value.lane.filter((lane): lane is number => Number.isInteger(lane));
    if (lanes.length > 0) entry.lane = lanes;
  }
  if (typeof value.spawnAtMs === "number" && Number.isFinite(value.spawnAtMs)) {
    entry.spawnAtMs = Math.max(0, value.spawnAtMs);
  }
  if (typeof value.x === "number" && Number.isFinite(value.x)) {
    entry.x = value.x;
  }
  return entry;
}

function parseWave(value: unknown): ConfiguredWave | null {
  if (!isRecord(value)) return null;

  const wave: ConfiguredWave = {};
  const waveNumber = positiveInteger(value.waveNumber);
  const count = nonNegativeInteger(value.count);
  const intervalMs = positiveInteger(value.intervalMs);
  const startDelayMs = nonNegativeInteger(value.startDelayMs);
  const entries = Array.isArray(value.entries)
    ? value.entries.map(parseWaveEntry).filter((entry): entry is ConfiguredWaveEntry => entry !== null)
    : undefined;

  if (waveNumber !== undefined) wave.waveNumber = waveNumber;
  if (entries && entries.length > 0) wave.entries = entries;
  wave.zombiePool = stringList(value.zombiePool);
  wave.zombieTypes = stringList(value.zombieTypes);
  if (count !== undefined) wave.count = Math.min(count, MAX_CONFIGURED_WAVE_COUNT);
  if (intervalMs !== undefined) wave.intervalMs = intervalMs;
  if (startDelayMs !== undefined) wave.startDelayMs = startDelayMs;
  if (typeof value.flag === "boolean") wave.flag = value.flag;
  if (typeof value.final === "boolean") wave.final = value.final;

  return (
    wave.entries ||
    wave.zombiePool ||
    wave.zombieTypes ||
    wave.count !== undefined ||
    wave.flag !== undefined ||
    wave.final !== undefined
  ) ? wave : null;
}

export function parseWaveConfig(value: unknown): WaveConfig | null {
  const rawWaves = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.waves)
      ? value.waves
      : [];
  const waves = rawWaves.map(parseWave).filter((wave): wave is ConfiguredWave => wave !== null);

  if (!Array.isArray(value) && isRecord(value)) {
    const finalWaveNumber = positiveInteger(value.finalWaveNumber);
    const flagEvery = positiveInteger(value.flagEvery);
    const defaultZombiePool = stringList(value.defaultZombiePool ?? value.zombiePool);
    if (waves.length === 0 && finalWaveNumber === undefined && !defaultZombiePool) return null;
    return {
      waves,
      ...(finalWaveNumber !== undefined ? { finalWaveNumber } : {}),
      ...(flagEvery !== undefined ? { flagEvery } : {}),
      ...(defaultZombiePool ? { defaultZombiePool } : {}),
    };
  }

  return waves.length > 0 ? { waves } : null;
}

export function getFinalWaveNumber(waveConfig: WaveConfig | null | undefined): number {
  if (!waveConfig) return DEFAULT_FINAL_WAVE_NUMBER;
  if (waveConfig.finalWaveNumber !== undefined) return waveConfig.finalWaveNumber;

  const explicitFinalIndex = waveConfig.waves.findIndex((wave) => wave.final === true);
  if (explicitFinalIndex >= 0) {
    return waveConfig.waves[explicitFinalIndex].waveNumber ?? explicitFinalIndex + 1;
  }

  return waveConfig.waves.length > 0 ? waveConfig.waves.length : DEFAULT_FINAL_WAVE_NUMBER;
}

function pickWaveDefinition(waveNumber: number, waveConfig: WaveConfig): ConfiguredWave | null {
  return (
    waveConfig.waves.find((wave) => wave.waveNumber === waveNumber) ??
    waveConfig.waves[waveNumber - 1] ??
    null
  );
}

function nextRandomIndex(max: number, rngState: number): { index: number; rngState: number } {
  const next = nextRandomValue(rngState);
  return {
    index: Math.floor(next.value * max),
    rngState: next.rngState,
  };
}

function randomLane(gridRows: number, rngState: number): { lane: number; rngState: number } {
  const picked = nextRandomIndex(Math.max(1, gridRows), rngState);
  return { lane: picked.index, rngState: picked.rngState };
}

function resolveLane(
  lane: ConfiguredWaveEntry["lane"],
  gridRows: number,
  rngState: number
): { lane: number; rngState: number } {
  if (typeof lane === "number") {
    return { lane: Math.max(0, Math.min(gridRows - 1, lane)), rngState };
  }
  if (Array.isArray(lane) && lane.length > 0) {
    const picked = nextRandomIndex(lane.length, rngState);
    return {
      lane: Math.max(0, Math.min(gridRows - 1, lane[picked.index])),
      rngState: picked.rngState,
    };
  }
  return randomLane(gridRows, rngState);
}

function shouldAddFlag(waveNumber: number, wave: ConfiguredWave | null, waveConfig?: WaveConfig | null): boolean {
  if (wave?.flag === true || wave?.final === true) return true;
  const flagEvery = waveConfig?.flagEvery ?? DEFAULT_FLAG_EVERY;
  return waveNumber % flagEvery === 0;
}

function fromConfiguredWave(
  waveNumber: number,
  gridRows: number,
  rngState: number,
  waveConfig: WaveConfig,
  wave: ConfiguredWave
): GeneratedWave {
  let currentRng = normalizeRngState(rngState);
  const entries: WaveEntry[] = [];

  if (wave.entries) {
    for (const entry of wave.entries) {
      const laneResult = resolveLane(entry.lane, gridRows, currentRng);
      currentRng = laneResult.rngState;
      entries.push({
        zombieType: entry.zombieType,
        lane: laneResult.lane,
        spawnAtMs: entry.spawnAtMs ?? 0,
        ...(entry.x !== undefined ? { x: entry.x } : {}),
      });
    }
  } else {
    const pool = wave.zombiePool ?? wave.zombieTypes ?? waveConfig.defaultZombiePool ?? availableTypes(waveNumber);
    const count = wave.count ?? Math.min(3 + waveNumber * 2, 20);
    const intervalMs = wave.intervalMs ?? DEFAULT_SPAWN_INTERVAL_MS;
    const startDelayMs = wave.startDelayMs ?? 0;

    for (let i = 0; i < count; i++) {
      const typeResult = nextRandomIndex(pool.length, currentRng);
      currentRng = typeResult.rngState;
      const laneResult = randomLane(gridRows, currentRng);
      currentRng = laneResult.rngState;
      entries.push({
        zombieType: pool[typeResult.index],
        lane: laneResult.lane,
        spawnAtMs: startDelayMs + i * intervalMs,
      });
    }
  }

  const isFlagWave = shouldAddFlag(waveNumber, wave, waveConfig);
  if (isFlagWave && !entries.some((entry) => entry.zombieType === "FLAG")) {
    const laneResult = randomLane(gridRows, currentRng);
    currentRng = laneResult.rngState;
    const latestSpawnAtMs = entries.reduce((latest, entry) => Math.max(latest, entry.spawnAtMs), 0);
    entries.push({
      zombieType: "FLAG",
      lane: laneResult.lane,
      spawnAtMs: latestSpawnAtMs + 500,
    });
  }

  return {
    entries,
    rngState: currentRng,
    isFlagWave,
    isFinalWave: wave.final === true || waveNumber >= getFinalWaveNumber(waveConfig),
  };
}

function fromFallbackProgression(
  waveNumber: number,
  gridRows: number,
  rngState: number,
  waveConfig?: WaveConfig | null
): GeneratedWave {
  let currentRng = normalizeRngState(rngState);
  const types = waveConfig?.defaultZombiePool ?? availableTypes(waveNumber);
  const count = Math.min(3 + waveNumber * 2, 20);
  const entries: WaveEntry[] = [];

  for (let i = 0; i < count; i++) {
    const typeResult = nextRandomIndex(types.length, currentRng);
    currentRng = typeResult.rngState;
    const laneResult = randomLane(gridRows, currentRng);
    currentRng = laneResult.rngState;
    entries.push({
      zombieType: types[typeResult.index],
      lane: laneResult.lane,
      spawnAtMs: i * DEFAULT_SPAWN_INTERVAL_MS,
    });
  }

  const isFlagWave = shouldAddFlag(waveNumber, null, waveConfig);
  if (isFlagWave) {
    const laneResult = randomLane(gridRows, currentRng);
    currentRng = laneResult.rngState;
    entries.push({
      zombieType: "FLAG",
      lane: laneResult.lane,
      spawnAtMs: count * DEFAULT_SPAWN_INTERVAL_MS + 500,
    });
  }

  return {
    entries,
    rngState: currentRng,
    isFlagWave,
    isFinalWave: waveNumber >= getFinalWaveNumber(waveConfig),
  };
}

/** Generate a deterministic wave of zombie spawn entries. */
export function generateWave(
  waveNumber: number,
  gridRows: number,
  rngState: number = DEFAULT_RNG_SEED,
  waveConfig?: WaveConfig | null
): GeneratedWave {
  const finalWaveNumber = getFinalWaveNumber(waveConfig);
  if (waveConfig && waveNumber > finalWaveNumber) {
    return {
      entries: [],
      rngState: normalizeRngState(rngState),
      isFlagWave: false,
      isFinalWave: false,
    };
  }

  const configuredWave = waveConfig ? pickWaveDefinition(waveNumber, waveConfig) : null;
  if (waveConfig && configuredWave) {
    return fromConfiguredWave(waveNumber, gridRows, rngState, waveConfig, configuredWave);
  }

  return fromFallbackProgression(waveNumber, gridRows, rngState, waveConfig);
}
