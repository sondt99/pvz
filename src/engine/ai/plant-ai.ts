import type { RuntimePlant, RuntimeZombie, RuntimeProjectile, RuntimeSunDrop } from "../types";
import type { PlantDefinition } from "../types";
import {
  createStraightProjectile,
  createLobbedProjectile,
} from "../physics/trajectory";
import { createPlantSunDrop, shouldProduceSun } from "../sun";

let _projCounter = 0;
let _sunDropCounter = 0;

export function resetPlantAiCounters() {
  _projCounter = 0;
  _sunDropCounter = 0;
}

/**
 * Find the nearest (rightmost x) non-underground zombie in the given lane.
 * Returns null if no targetable zombie exists.
 */
export function findNearestZombieInLane(
  lane: number,
  zombies: Record<string, RuntimeZombie>
): RuntimeZombie | null {
  let nearest: RuntimeZombie | null = null;
  for (const zombie of Object.values(zombies)) {
    if (zombie.lane !== lane) continue;
    if (zombie.isUnderground) continue;
    if (nearest === null || zombie.x > nearest.x) nearest = zombie;
  }
  return nearest;
}

/**
 * Whether a plant should fire this tick.
 * Conditions: not sleeping/charging, attack cooldown elapsed, zombie in lane ahead.
 */
export function shouldPlantAttack(
  plant: RuntimePlant,
  def: PlantDefinition,
  gameTimeMs: number,
  zombies: Record<string, RuntimeZombie>
): boolean {
  if (plant.isSleeping || plant.isCharging) return false;
  if (def.attackDamage === null || def.attackCooldownMs === null) return false;
  if (def.attackRange === "none") return false;
  if (gameTimeMs - plant.lastAttackAtMs < def.attackCooldownMs) return false;
  const target = findNearestZombieInLane(plant.row, zombies);
  return target !== null && target.x > plant.col;
}

/**
 * Fire a projectile from a plant. Returns the new projectile and updated plant.
 */
export function plantFire(
  plant: RuntimePlant,
  def: PlantDefinition,
  gameTimeMs: number,
  zombies: Record<string, RuntimeZombie>
): { projectile: RuntimeProjectile | null; updatedPlant: RuntimePlant } {
  const target = findNearestZombieInLane(plant.row, zombies);
  if (!target || !def.projectileType || def.attackDamage === null) {
    return { projectile: null, updatedPlant: plant };
  }

  const id = `proj-${++_projCounter}-${def.projectileType}`;
  const updatedPlant: RuntimePlant = { ...plant, lastAttackAtMs: gameTimeMs };

  if (def.trajectory === "straight") {
    const opts: { slowFactor?: number; isFire?: boolean; piercing?: boolean } = {};
    if (def.plantType === "SNOW_PEA") opts.slowFactor = 0.5;
    if (def.plantType === "FUME_SHROOM") opts.piercing = true;
    const projectile = createStraightProjectile(id, def.projectileType, plant.row, plant.col, def.attackDamage, opts);
    return { projectile, updatedPlant };
  }

  if (def.trajectory === "lobbed") {
    const projectile = createLobbedProjectile(
      id, def.projectileType,
      plant.row, plant.col,
      target.lane, Math.max(0, Math.round(target.x)),
      def.attackDamage
    );
    return { projectile, updatedPlant };
  }

  return { projectile: null, updatedPlant };
}

/**
 * Check and produce sun from a sun-producing plant (Sunflower, Sun-shroom, Marigold).
 */
export function plantProduceSun(
  plant: RuntimePlant,
  def: PlantDefinition,
  gameTimeMs: number
): { sunDrop: RuntimeSunDrop | null; updatedPlant: RuntimePlant } {
  if (!def.produceSun || !def.sunProduceIntervalMs || !def.sunProduceAmount) {
    return { sunDrop: null, updatedPlant: plant };
  }
  if (plant.isSleeping) return { sunDrop: null, updatedPlant: plant };
  if (!shouldProduceSun(gameTimeMs, plant.lastSunAtMs, def.sunProduceIntervalMs)) {
    return { sunDrop: null, updatedPlant: plant };
  }
  const id = `sun-plant-${++_sunDropCounter}`;
  const sunDrop = createPlantSunDrop(gameTimeMs, id, plant.col, plant.row, def.sunProduceAmount);
  return { sunDrop, updatedPlant: { ...plant, lastSunAtMs: gameTimeMs } };
}
