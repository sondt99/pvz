import type { EnvironmentConfig, RuntimeSunDrop } from "./types";
import {
  SKY_SUN_INTERVAL_MS,
  SUN_LIFETIME_MS,
  SUN_VALUE_SKY,
  SUN_VALUE_SUNFLOWER,
  SUNFLOWER_PRODUCE_INTERVAL_MS,
  SKY_SUN_FALL_SPEED_PER_MS,
} from "./constants";

export function getInitialSun(_env: EnvironmentConfig): number {
  return 50;
}

export function skyDropsEnabled(env: EnvironmentConfig): boolean {
  return env.skyDropSun;
}

/**
 * Tick the sky-sun timer.
 * Returns whether a drop should spawn this tick and the updated nextSkyDropAtMs.
 */
export function tickSkySun(
  gameTimeMs: number,
  nextSkyDropAtMs: number,
  env: EnvironmentConfig
): { shouldDrop: boolean; nextSkyDropAtMs: number } {
  if (!env.skyDropSun) {
    return { shouldDrop: false, nextSkyDropAtMs };
  }
  if (gameTimeMs < nextSkyDropAtMs) {
    return { shouldDrop: false, nextSkyDropAtMs };
  }
  return {
    shouldDrop: true,
    nextSkyDropAtMs: gameTimeMs + SKY_SUN_INTERVAL_MS,
  };
}

/**
 * Build a sky sun drop at a deterministic column (caller supplies randomness).
 * `col` is the grid column (0-based); the drop starts above the grid (y = -1).
 */
export function createSkySunDrop(
  gameTimeMs: number,
  instanceId: string,
  col: number,
  targetRow: number
): RuntimeSunDrop {
  return {
    instanceId,
    x: col + 0.5,
    y: -1,
    targetY: targetRow,
    value: SUN_VALUE_SKY,
    source: "sky",
    state: "falling",
    spawnedAtMs: gameTimeMs,
    lifetimeMs: SUN_LIFETIME_MS,
  };
}

/** True when a Sunflower / Sun-shroom should produce sun. */
export function shouldProduceSun(
  gameTimeMs: number,
  lastSunAtMs: number,
  intervalMs: number = SUNFLOWER_PRODUCE_INTERVAL_MS
): boolean {
  return gameTimeMs - lastSunAtMs >= intervalMs;
}

/** Build a plant-produced sun drop. */
export function createPlantSunDrop(
  gameTimeMs: number,
  instanceId: string,
  col: number,
  row: number,
  value: number = SUN_VALUE_SUNFLOWER
): RuntimeSunDrop {
  return {
    instanceId,
    x: col + 0.5,
    y: row,
    targetY: row + 0.3,
    value,
    source: "plant",
    state: "falling",
    spawnedAtMs: gameTimeMs,
    lifetimeMs: SUN_LIFETIME_MS,
  };
}

/**
 * Deduct `cost` from current sun.
 * Returns the new total, or null if insufficient sun.
 */
export function spendSun(currentSun: number, cost: number): number | null {
  if (currentSun < cost) return null;
  return currentSun - cost;
}

/** Add `dropValue` to current sun. */
export function collectSun(currentSun: number, dropValue: number): number {
  return currentSun + dropValue;
}

/** Advance a falling sun drop toward its landing row. */
export function advanceSunDrop(
  drop: RuntimeSunDrop,
  deltaMs: number,
  fallSpeedPerMs: number = SKY_SUN_FALL_SPEED_PER_MS
): RuntimeSunDrop {
  if (drop.state !== "falling") return drop;
  const newY = drop.y + fallSpeedPerMs * deltaMs;
  if (newY >= drop.targetY) {
    return { ...drop, y: drop.targetY, state: "landed" };
  }
  return { ...drop, y: newY };
}

/** True when a landed drop has exceeded its lifetime. */
export function isSunDropExpired(
  drop: RuntimeSunDrop,
  gameTimeMs: number
): boolean {
  return (
    drop.state === "landed" &&
    gameTimeMs - drop.spawnedAtMs > drop.lifetimeMs
  );
}
