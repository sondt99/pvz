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
 * Find the closest targetable zombie ahead of the plant/source column.
 */
export function findNearestZombieInLane(
  lane: number,
  zombies: Record<string, RuntimeZombie>,
  sourceCol = -Infinity,
  opts: { includeAerial?: boolean } = {}
): RuntimeZombie | null {
  let nearest: RuntimeZombie | null = null;
  for (const zombie of Object.values(zombies)) {
    if (zombie.lane !== lane) continue;
    if (zombie.isUnderground) continue;
    if (zombie.isAerial && !opts.includeAerial) continue;
    if (zombie.x <= sourceCol) continue;
    if (nearest === null || zombie.x < nearest.x) nearest = zombie;
  }
  return nearest;
}

export function findNearestZombieBehindInLane(
  lane: number,
  zombies: Record<string, RuntimeZombie>,
  sourceCol: number,
  opts: { includeAerial?: boolean } = {}
): RuntimeZombie | null {
  let nearest: RuntimeZombie | null = null;
  for (const zombie of Object.values(zombies)) {
    if (zombie.lane !== lane) continue;
    if (zombie.isUnderground) continue;
    if (zombie.isAerial && !opts.includeAerial) continue;
    if (zombie.x >= sourceCol) continue;
    if (nearest === null || zombie.x > nearest.x) nearest = zombie;
  }
  return nearest;
}

function threepeaterLanes(row: number, gridRows: number): number[] {
  return [row - 1, row, row + 1].filter((lane) => lane >= 0 && lane < gridRows);
}

function hasForwardTargetInLanes(
  lanes: number[],
  zombies: Record<string, RuntimeZombie>,
  sourceCol: number,
  opts: { includeAerial?: boolean } = {}
): boolean {
  return lanes.some((lane) => findNearestZombieInLane(lane, zombies, sourceCol, opts) !== null);
}

/**
 * Whether a plant should fire this tick.
 * Conditions: not sleeping/charging, attack cooldown elapsed, zombie in lane ahead.
 */
export function shouldPlantAttack(
  plant: RuntimePlant,
  def: PlantDefinition,
  gameTimeMs: number,
  zombies: Record<string, RuntimeZombie>,
  gridRows = 5
): boolean {
  if (plant.isSleeping || plant.isCharging) return false;
  if (def.attackDamage === null || def.attackCooldownMs === null) return false;
  if (def.projectileType === null || def.trajectory === null) return false;
  if (def.attackRange === "none") return false;
  if (gameTimeMs - plant.lastAttackAtMs < def.attackCooldownMs) return false;
  const includeAerial = def.plantType === "CACTUS";

  if (def.plantType === "THREEPEATER") {
    return hasForwardTargetInLanes(threepeaterLanes(plant.row, gridRows), zombies, plant.col);
  }

  if (def.plantType === "SPLIT_PEA") {
    return (
      findNearestZombieInLane(plant.row, zombies, plant.col) !== null ||
      findNearestZombieBehindInLane(plant.row, zombies, plant.col) !== null
    );
  }

  const target = findNearestZombieInLane(plant.row, zombies, plant.col, { includeAerial });
  return target !== null;
}

/**
 * Fire a projectile from a plant. Returns the new projectile and updated plant.
 */
export function plantFire(
  plant: RuntimePlant,
  def: PlantDefinition,
  gameTimeMs: number,
  zombies: Record<string, RuntimeZombie>,
  gridRows = 5
): { projectile: RuntimeProjectile | null; projectiles: RuntimeProjectile[]; updatedPlant: RuntimePlant } {
  const includeAerial = def.plantType === "CACTUS";
  const target = findNearestZombieInLane(plant.row, zombies, plant.col, { includeAerial });
  if (!def.projectileType || def.attackDamage === null) {
    return { projectile: null, projectiles: [], updatedPlant: plant };
  }
  const projectileType = def.projectileType;
  const attackDamage = def.attackDamage;

  const updatedPlant: RuntimePlant = { ...plant, lastAttackAtMs: gameTimeMs };

  if (def.trajectory === "straight") {
    const opts: { slowFactor?: number; isFire?: boolean; piercing?: boolean; canHitAerial?: boolean } = {};
    if (def.plantType === "SNOW_PEA") opts.slowFactor = 0.5;
    if (def.plantType === "FUME_SHROOM") opts.piercing = true;
    if (def.plantType === "CACTUS") opts.canHitAerial = true;

    const makeProjectile = (
      lane: number,
      direction: "forward" | "backward" = "forward",
      xOffset?: number
    ) => createStraightProjectile(
      `proj-${++_projCounter}-${projectileType}`,
      projectileType,
      lane,
      plant.col,
      attackDamage,
      { ...opts, direction, xOffset }
    );

    if (def.plantType === "REPEATER") {
      if (!target) return { projectile: null, projectiles: [], updatedPlant: plant };
      const projectiles = [makeProjectile(plant.row, "forward", 0.8), makeProjectile(plant.row, "forward", 0.45)];
      return { projectile: projectiles[0], projectiles, updatedPlant };
    }

    if (def.plantType === "THREEPEATER") {
      const lanes = threepeaterLanes(plant.row, gridRows);
      if (!hasForwardTargetInLanes(lanes, zombies, plant.col)) {
        return { projectile: null, projectiles: [], updatedPlant: plant };
      }
      const projectiles = lanes.map((lane) => makeProjectile(lane));
      return { projectile: projectiles[0] ?? null, projectiles, updatedPlant };
    }

    if (def.plantType === "SPLIT_PEA") {
      const projectiles: RuntimeProjectile[] = [];
      if (target) projectiles.push(makeProjectile(plant.row));
      if (findNearestZombieBehindInLane(plant.row, zombies, plant.col)) {
        projectiles.push(makeProjectile(plant.row, "backward", -0.25));
        projectiles.push(makeProjectile(plant.row, "backward", -0.55));
      }
      return { projectile: projectiles[0] ?? null, projectiles, updatedPlant };
    }

    if (!target) return { projectile: null, projectiles: [], updatedPlant: plant };
    const projectile = makeProjectile(plant.row);
    return { projectile, projectiles: [projectile], updatedPlant };
  }

  if (def.trajectory === "lobbed") {
    if (!target) return { projectile: null, projectiles: [], updatedPlant: plant };
    const projectile = createLobbedProjectile(
      `proj-${++_projCounter}-${projectileType}`,
      projectileType,
      plant.row, plant.col,
      target.lane, Math.max(0, Math.round(target.x)),
      attackDamage
    );
    return { projectile, projectiles: [projectile], updatedPlant };
  }

  return { projectile: null, projectiles: [], updatedPlant };
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
