import type { RuntimePlant, RuntimeProjectile, RuntimeZombie } from "../types";
import {
  updateStraightProjectile,
  updateLobbedProjectile,
  isOffscreen,
  hasLobbedLanded,
} from "../physics/trajectory";
import { applyStatusEffect } from "./zombie-ai";
import { applyProjectileDamage, isZombieDead } from "../physics/collision";
import { FIRE_PEA_DAMAGE_MULTIPLIER } from "../constants";

const STRAIGHT_HIT_RADIUS = 0.5;
const STRAIGHT_LANE_HIT_RADIUS = 0.35;
const LOBBED_HIT_RADIUS = 1.5;
const LOBBED_SPLASH_LANES = 1;

function hasLobbedSplash(proj: RuntimeProjectile): boolean {
  return proj.projectileType === "MELON";
}

export function transformProjectileWithTorchwood(
  proj: RuntimeProjectile,
  plants: Record<string, RuntimePlant>,
  previousX: number
): RuntimeProjectile {
  if (proj.trajectory !== "straight" || proj.velX <= 0) return proj;

  const crossedTorchwood = Object.values(plants).some((plant) =>
    plant.plantType === "TORCHWOOD" &&
    !plant.isSleeping &&
    plant.row === proj.lane &&
    previousX < plant.col &&
    proj.x >= plant.col
  );
  if (!crossedTorchwood) return proj;

  if (proj.projectileType === "PEA" && proj.isFire !== true) {
    return {
      ...proj,
      projectileType: "FIRE_PEA",
      damage: proj.damage * FIRE_PEA_DAMAGE_MULTIPLIER,
      isFire: true,
    };
  }

  if (proj.projectileType === "FROZEN_PEA") {
    const { slowFactor: _slowFactor, isFire: _isFire, ...rest } = proj;
    return {
      ...rest,
      projectileType: "PEA",
    };
  }

  return proj;
}

export function advanceProjectile(proj: RuntimeProjectile, deltaMs: number): RuntimeProjectile {
  return proj.trajectory === "straight"
    ? updateStraightProjectile(proj, deltaMs)
    : updateLobbedProjectile(proj, deltaMs);
}

export function shouldRemoveProjectile(
  proj: RuntimeProjectile,
  gridCols: number,
  gridRows?: number
): boolean {
  if (proj.trajectory === "straight") {
    if (
      proj.maxTravelDistanceCols !== undefined &&
      Math.abs(proj.x - proj.sourceCol) >= proj.maxTravelDistanceCols
    ) {
      return true;
    }
    return isOffscreen(proj, gridCols, gridRows);
  }
  return hasLobbedLanded(proj);
}

function isInProjectileTravelDirection(proj: RuntimeProjectile, zombie: RuntimeZombie): boolean {
  const velLane = proj.velLane ?? 0;
  const sourceLane = proj.sourceLane ?? proj.lane;

  const colMatches = proj.velX > 0
    ? zombie.x > proj.sourceCol
    : proj.velX < 0
      ? zombie.x < proj.sourceCol
      : true;
  const laneMatches = velLane > 0
    ? zombie.lane > sourceLane - STRAIGHT_LANE_HIT_RADIUS
    : velLane < 0
      ? zombie.lane < sourceLane + STRAIGHT_LANE_HIT_RADIUS
      : true;

  return colMatches && laneMatches;
}

function distanceAlongProjectile(proj: RuntimeProjectile, zombie: RuntimeZombie): number {
  const velLane = proj.velLane ?? 0;
  const speed = Math.hypot(proj.velX, velLane);
  if (speed === 0) return 0;

  const sourceLane = proj.sourceLane ?? proj.lane;
  const unitX = proj.velX / speed;
  const unitLane = velLane / speed;
  return (zombie.x - proj.sourceCol) * unitX + (zombie.lane - sourceLane) * unitLane;
}

/** Find zombie IDs hit by a straight projectile. Piercing hits all; otherwise first. */
export function findStraightHits(
  proj: RuntimeProjectile,
  zombies: Record<string, RuntimeZombie>
): string[] {
  if (proj.trajectory !== "straight") return [];

  const inRange = Object.entries(zombies).filter(([, z]) =>
    Math.abs(z.lane - proj.lane) <= STRAIGHT_LANE_HIT_RADIUS &&
    !z.isUnderground &&
    (!z.isAerial || proj.canHitAerial === true) &&
    isInProjectileTravelDirection(proj, z) &&
    (
      proj.maxTravelDistanceCols === undefined ||
      Math.abs(z.x - proj.sourceCol) <= proj.maxTravelDistanceCols
    ) &&
    Math.abs(z.x - proj.x) <= STRAIGHT_HIT_RADIUS
  );

  if (proj.piercing) return inRange.map(([id]) => id);

  // Only the closest zombie in the projectile's travel direction.
  const sorted = inRange.sort(([, a], [, b]) =>
    distanceAlongProjectile(proj, a) - distanceAlongProjectile(proj, b)
  );
  return sorted.length > 0 ? [sorted[0][0]] : [];
}

/** Find zombie IDs hit at a lobbed projectile's target. Melons splash; other lobbers hit one. */
export function findLobbedHits(
  proj: RuntimeProjectile,
  zombies: Record<string, RuntimeZombie>
): string[] {
  if (proj.trajectory !== "lobbed" || !hasLobbedLanded(proj)) return [];
  const tgtCol = proj.targetCol ?? proj.x;
  const tgtLane = proj.targetLane ?? proj.lane;

  const candidates = Object.entries(zombies).filter(([, z]) =>
      !z.isUnderground &&
      (!z.isAerial || proj.canHitAerial === true) &&
      Math.abs(z.x - tgtCol) <= LOBBED_HIT_RADIUS
  );

  if (hasLobbedSplash(proj)) {
    return candidates
      .filter(([, z]) => Math.abs(z.lane - tgtLane) <= LOBBED_SPLASH_LANES)
      .map(([id]) => id);
  }

  const sameLane = candidates
    .filter(([, z]) => z.lane === tgtLane)
    .sort(([, a], [, b]) => Math.abs(a.x - tgtCol) - Math.abs(b.x - tgtCol));

  return sameLane.length > 0 ? [sameLane[0][0]] : [];
}

export interface HitResult {
  updatedZombies: Record<string, RuntimeZombie>;
  killedZombieIds: string[];
  removeProjectile: boolean;
}

export function applyProjectileHits(
  proj: RuntimeProjectile,
  zombies: Record<string, RuntimeZombie>,
  hitIds: string[],
  gameTimeMs = 0
): HitResult {
  if (hitIds.length === 0) return { updatedZombies: zombies, killedZombieIds: [], removeProjectile: false };

  const updatedZombies = { ...zombies };
  const killedZombieIds: string[] = [];

  for (const id of hitIds) {
    const zombie = updatedZombies[id];
    if (!zombie) continue;
    let damaged = applyProjectileDamage(zombie, proj.damage);

    if (proj.slowFactor !== undefined) {
      damaged = {
        ...damaged,
        statusEffects: [
          ...damaged.statusEffects.filter((e) => e.type !== "SLOWED"),
          { type: "SLOWED" as const, expiresAtMs: Infinity, factor: proj.slowFactor },
        ],
      };
    }

    if (proj.isFire) {
      damaged = {
        ...damaged,
        isFrozen: false,
        statusEffects: damaged.statusEffects.filter((e) =>
          e.type !== "FROZEN" && e.type !== "SLOWED"
        ),
      };
    }

    if (proj.statusEffectOnHit) {
      damaged = applyStatusEffect(damaged, {
        type: proj.statusEffectOnHit.type,
        expiresAtMs: gameTimeMs + proj.statusEffectOnHit.durationMs,
        ...(proj.statusEffectOnHit.factor !== undefined
          ? { factor: proj.statusEffectOnHit.factor }
          : {}),
      });
    }

    updatedZombies[id] = damaged;
    if (isZombieDead(damaged)) killedZombieIds.push(id);
  }

  return {
    updatedZombies,
    killedZombieIds,
    removeProjectile: !proj.piercing,
  };
}
