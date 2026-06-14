import type { RuntimeProjectile, RuntimeZombie } from "../types";
import {
  updateStraightProjectile,
  updateLobbedProjectile,
  isOffscreen,
  hasLobbedLanded,
} from "../physics/trajectory";
import { applyProjectileDamage, isZombieDead } from "../physics/collision";

const STRAIGHT_HIT_RADIUS = 0.5;

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
    z.x > proj.sourceCol &&
    Math.abs(z.x - proj.x) <= STRAIGHT_HIT_RADIUS
  );

  if (proj.piercing) return inRange.map(([id]) => id);

  // Only the closest zombie
  const sorted = inRange.sort(([, a], [, b]) => a.x - b.x);
  return sorted.length > 0 ? [sorted[0][0]] : [];
}

/** Find zombie IDs in AoE radius of a lobbed projectile's target. */
export function findLobbedHits(
  proj: RuntimeProjectile,
  zombies: Record<string, RuntimeZombie>
): string[] {
  if (proj.trajectory !== "lobbed" || !hasLobbedLanded(proj)) return [];
  const tgtCol = proj.targetCol ?? proj.x;
  const tgtLane = proj.targetLane ?? proj.lane;
  return Object.entries(zombies)
    .filter(([, z]) =>
      Math.abs(z.x - tgtCol) <= 1.5 &&
      Math.abs(z.lane - tgtLane) <= 1 &&
      !z.isUnderground
    )
    .map(([id]) => id);
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
