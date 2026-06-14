import type { RuntimeZombie, RuntimePlant, RuntimeStatusEffect, StatusEffectType } from "../types";

function hasStatusEffect(zombie: RuntimeZombie, type: StatusEffectType): boolean {
  return zombie.statusEffects.some((effect) => effect.type === type);
}

export function isZombieImmobilized(zombie: RuntimeZombie): boolean {
  return zombie.isFrozen || hasStatusEffect(zombie, "FROZEN") || hasStatusEffect(zombie, "BUTTERED");
}

/** Effective movement speed factoring in status effects. */
export function getEffectiveSpeed(zombie: RuntimeZombie): number {
  if (isZombieImmobilized(zombie)) return 0;
  const slow = zombie.statusEffects.find((e) => e.type === "SLOWED");
  if (slow) return zombie.speedColsPerSec * (slow.factor ?? 0.5);
  return zombie.speedColsPerSec;
}

/** Move a zombie by deltaMs. Returns updated zombie (does NOT move if eating/immobilized). */
export function moveZombie(zombie: RuntimeZombie, deltaMs: number): RuntimeZombie {
  if (zombie.isEating || isZombieImmobilized(zombie)) return zombie;
  const speed = getEffectiveSpeed(zombie);
  const direction = zombie.direction === "right" ? 1 : -1;
  return { ...zombie, x: zombie.x + direction * speed * (deltaMs / 1000) };
}

/** Remove expired status effects; update isFrozen derived flag. */
export function tickStatusEffects(
  zombie: RuntimeZombie,
  gameTimeMs: number
): RuntimeZombie {
  const active = zombie.statusEffects.filter((e) => e.expiresAtMs > gameTimeMs);
  const isFrozen = active.some((e) => e.type === "FROZEN");
  const immobilized = isFrozen || active.some((e) => e.type === "BUTTERED");
  const isEating = immobilized ? false : zombie.isEating;
  return { ...zombie, statusEffects: active, isFrozen, isEating };
}

/** True when zombie is in range to eat this plant. */
export function isZombieEatingPlant(zombie: RuntimeZombie, plant: RuntimePlant): boolean {
  if (zombie.lane !== plant.row) return false;
  // Aerial zombies bypass plants unless the plant explicitly blocks aerial movement
  // (e.g. Tall-nut has blocksAerial: true and forces Balloon/Bungee to stop and eat)
  if (zombie.isAerial && !plant.blocksAerial) return false;
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
  const immobilized = isFrozen || effects.some((e) => e.type === "BUTTERED");
  return { ...zombie, statusEffects: effects, isFrozen, isEating: immobilized ? false : zombie.isEating };
}
