import type { RuntimeProjectile, RuntimeZombie, RuntimePlant } from "../types";

const STRAIGHT_HIT_RADIUS = 0.4;   // column units
const LOBBED_AOE_COLS = 1.5;
const LOBBED_AOE_LANES = 1;

export function checkStraightHit(
  proj: RuntimeProjectile,
  zombie: RuntimeZombie
): boolean {
  if (proj.trajectory !== "straight") return false;
  if (proj.lane !== zombie.lane) return false;
  return Math.abs(proj.x - zombie.x) <= STRAIGHT_HIT_RADIUS;
}

export function checkLobbedAoE(
  proj: RuntimeProjectile,
  zombie: RuntimeZombie
): boolean {
  if (proj.trajectory !== "lobbed") return false;
  if (proj.targetCol === undefined || proj.targetLane === undefined) return false;
  return (
    Math.abs(zombie.x - proj.targetCol) <= LOBBED_AOE_COLS &&
    Math.abs(zombie.lane - proj.targetLane) <= LOBBED_AOE_LANES
  );
}

/**
 * Apply `damage` to a zombie. Armor absorbs damage first;
 * overflow damage carries through to health.
 */
export function applyProjectileDamage(
  zombie: RuntimeZombie,
  damage: number
): RuntimeZombie {
  if (zombie.armorHealth > 0) {
    const remaining = zombie.armorHealth - damage;
    if (remaining > 0) return { ...zombie, armorHealth: remaining };
    return { ...zombie, armorHealth: 0, health: zombie.health + remaining };
  }
  return { ...zombie, health: zombie.health - damage };
}

export function isZombieDead(zombie: RuntimeZombie): boolean {
  return zombie.health <= 0;
}

export function zombieReachesPlant(
  zombie: RuntimeZombie,
  plant: RuntimePlant
): boolean {
  if (zombie.lane !== plant.row) return false;
  return zombie.x <= plant.col + 0.5 && zombie.x >= plant.col - 0.3;
}

export function applyEatingDamage(
  plant: RuntimePlant,
  eatDamagePerSec: number,
  deltaMs: number
): RuntimePlant {
  return { ...plant, health: plant.health - eatDamagePerSec * (deltaMs / 1000) };
}

export function isPlantDead(plant: RuntimePlant): boolean {
  return plant.health <= 0;
}
