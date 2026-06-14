import type { RuntimeZombie, RuntimePlant, RuntimeStatusEffect } from "../types";

/** Effective movement speed factoring in status effects. */
export function getEffectiveSpeed(zombie: RuntimeZombie): number {
  if (zombie.isFrozen) return 0;
  const slow = zombie.statusEffects.find((e) => e.type === "SLOWED");
  if (slow) return zombie.speedColsPerSec * (slow.factor ?? 0.5);
  return zombie.speedColsPerSec;
}

/** Move a zombie left by deltaMs. Returns updated zombie (does NOT move if eating/frozen). */
export function moveZombie(zombie: RuntimeZombie, deltaMs: number): RuntimeZombie {
  if (zombie.isEating || zombie.isFrozen) return zombie;
  const speed = getEffectiveSpeed(zombie);
  return { ...zombie, x: zombie.x - speed * (deltaMs / 1000) };
}

/** Remove expired status effects; update isFrozen derived flag. */
export function tickStatusEffects(
  zombie: RuntimeZombie,
  gameTimeMs: number
): RuntimeZombie {
  const active = zombie.statusEffects.filter((e) => e.expiresAtMs > gameTimeMs);
  const isFrozen = active.some((e) => e.type === "FROZEN");
  const isEating = isFrozen ? false : zombie.isEating;
  return { ...zombie, statusEffects: active, isFrozen, isEating };
}

/** True when zombie is in range to eat this plant. */
export function isZombieEatingPlant(zombie: RuntimeZombie, plant: RuntimePlant): boolean {
  if (zombie.lane !== plant.row) return false;
  if (zombie.isAerial) return false;
  return zombie.x <= plant.col + 0.5 && zombie.x >= plant.col - 0.3;
}

export function startEating(zombie: RuntimeZombie, plantId: string): RuntimeZombie {
  return { ...zombie, isEating: true, eatTargetId: plantId };
}

export function stopEating(zombie: RuntimeZombie): RuntimeZombie {
  return { ...zombie, isEating: false, eatTargetId: null };
}

/** Apply per-second eating damage over deltaMs. */
export function applyEatingDamage(
  plant: RuntimePlant,
  zombie: RuntimeZombie,
  deltaMs: number
): RuntimePlant {
  return { ...plant, health: plant.health - zombie.eatDamagePerSec * (deltaMs / 1000) };
}

/** Apply (or refresh) a status effect on a zombie. */
export function applyStatusEffect(
  zombie: RuntimeZombie,
  effect: RuntimeStatusEffect
): RuntimeZombie {
  const others = zombie.statusEffects.filter((e) => e.type !== effect.type);
  const effects = [...others, effect];
  const isFrozen = effects.some((e) => e.type === "FROZEN");
  return { ...zombie, statusEffects: effects, isFrozen, isEating: isFrozen ? false : zombie.isEating };
}
