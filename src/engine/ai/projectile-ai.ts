import type { RuntimeProjectile, RuntimeZombie } from "../types";
import {
  updateStraightProjectile,
  updateLobbedProjectile,
  isOffscreen,
  hasLobbedLanded,
} from "../physics/trajectory";
import { applyProjectileDamage, isZombieDead } from "../physics/collision";

const STRAIGHT_HIT_RADIUS = 0.5;
const LOBBED_HIT_RADIUS = 1.5;
const LOBBED_SPLASH_LANES = 1;

function hasLobbedSplash(proj: RuntimeProjectile): boolean {
  return proj.projectileType === "MELON";
}

export function advanceProjectile(proj: RuntimeProjectile, deltaMs: number): RuntimeProjectile {
  return proj.trajectory === "straight"
    ? updateStraightProjectile(proj, deltaMs)
    : updateLobbedProjectile(proj, deltaMs);
}

export function shouldRemoveProjectile(proj: RuntimeProjectile, gridCols: number): boolean {
  if (proj.trajectory === "straight") return isOffscreen(proj, gridCols);
  return hasLobbedLanded(proj);
}

/** Find zombie IDs hit by a straight projectile. Piercing hits all; otherwise first. */
export function findStraightHits(
  proj: RuntimeProjectile,
  zombies: Record<string, RuntimeZombie>
): string[] {
  if (proj.trajectory !== "straight") return [];

  const inRange = Object.entries(zombies).filter(([, z]) =>
    z.lane === proj.lane &&
    !z.isUnderground &&
    (!z.isAerial || proj.canHitAerial === true) &&
    (proj.velX >= 0 ? z.x > proj.sourceCol : z.x < proj.sourceCol) &&
    Math.abs(z.x - proj.x) <= STRAIGHT_HIT_RADIUS
  );

  if (proj.piercing) return inRange.map(([id]) => id);

  // Only the closest zombie in the projectile's travel direction.
  const sorted = inRange.sort(([, a], [, b]) => proj.velX >= 0 ? a.x - b.x : b.x - a.x);
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
  hitIds: string[]
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

    updatedZombies[id] = damaged;
    if (isZombieDead(damaged)) killedZombieIds.push(id);
  }

  return {
    updatedZombies,
    killedZombieIds,
    removeProjectile: !proj.piercing,
  };
}
