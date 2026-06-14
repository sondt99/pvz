const UINT32_RANGE = 0x1_0000_0000;

export const DEFAULT_RNG_SEED = 0x1a2b3c4d;

export function hashStringToSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return normalizeRngState(hash);
}

export function createInitialRngState(seedParts: unknown[]): number {
  return hashStringToSeed(JSON.stringify(seedParts));
}

export function normalizeRngState(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_RNG_SEED;
  }
  const normalized = value >>> 0;
  return normalized === 0 ? DEFAULT_RNG_SEED : normalized;
}

export function nextRandomValue(rngState: number): { value: number; rngState: number } {
  const nextState = normalizeRngState(
    Math.imul(normalizeRngState(rngState), 1_664_525) + 1_013_904_223
  );
  return {
    value: nextState / UINT32_RANGE,
    rngState: nextState,
  };
}
