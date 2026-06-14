import type { RuntimeProjectile } from "../types";

const STRAIGHT_SPEED_COLS_PER_SEC = 8;
const GRAVITY_COLS_PER_SEC2 = 20;

export function updateStraightProjectile(
  proj: RuntimeProjectile,
  deltaMs: number
): RuntimeProjectile {
  return { ...proj, x: proj.x + proj.velX * (deltaMs / 1000) };
}

export function updateLobbedProjectile(
  proj: RuntimeProjectile,
  deltaMs: number
): RuntimeProjectile {
  const deltaS = deltaMs / 1000;
  const newVelY = proj.velY + GRAVITY_COLS_PER_SEC2 * deltaS;
  return {
    ...proj,
    x: proj.x + proj.velX * deltaS,
    y: proj.y + proj.velY * deltaS,
    velY: newVelY,
  };
}

export function isOffscreen(proj: RuntimeProjectile, gridCols: number): boolean {
  if (proj.trajectory !== "straight") return false;
  return proj.x < -1 || proj.x > gridCols + 1;
}

export function hasLobbedLanded(proj: RuntimeProjectile): boolean {
  if (proj.trajectory !== "lobbed" || proj.targetCol === undefined) return false;
  return proj.x >= proj.targetCol;
}

/**
 * Calculate initial velocity for a lobbed arc.
 *
 *   x(t) = srcX + velX*t           ⟹  velX = Δx / t
 *   y(t) = velY*t + ½·g·t²         The arc must return y≈0 at t=flightTime:
 *   0 = velY·t + ½·g·t²            ⟹  velY = −½·g·t
 */
export function calcLobbedVelocity(
  srcX: number,
  tgtX: number,
  flightTimeMs: number
): { velX: number; velY: number } {
  const t = flightTimeMs / 1000;
  return {
    velX: (tgtX - srcX) / t,
    velY: -0.5 * GRAVITY_COLS_PER_SEC2 * t,
  };
}

export function createStraightProjectile(
  instanceId: string,
  projectileType: string,
  lane: number,
  sourceCol: number,
  damage: number,
  opts: {
    slowFactor?: number;
    isFire?: boolean;
    piercing?: boolean;
    canHitAerial?: boolean;
    maxTravelDistanceCols?: number;
    direction?: "forward" | "backward";
    xOffset?: number;
  } = {}
): RuntimeProjectile {
  const direction = opts.direction ?? "forward";
  const speed = direction === "backward" ? -STRAIGHT_SPEED_COLS_PER_SEC : STRAIGHT_SPEED_COLS_PER_SEC;
  const xOffset = opts.xOffset ?? (direction === "backward" ? -0.25 : 0.8);

  return {
    instanceId,
    projectileType,
    lane,
    x: sourceCol + xOffset,
    y: 0,
    velX: speed,
    velY: 0,
    damage,
    trajectory: "straight",
    sourceCol,
    slowFactor: opts.slowFactor,
    isFire: opts.isFire,
    piercing: opts.piercing,
    canHitAerial: opts.canHitAerial,
    maxTravelDistanceCols: opts.maxTravelDistanceCols,
  };
}

export function createLobbedProjectile(
  instanceId: string,
  projectileType: string,
  sourceLane: number,
  sourceCol: number,
  targetLane: number,
  targetCol: number,
  damage: number,
  flightTimeMs = 2000
): RuntimeProjectile {
  const { velX, velY } = calcLobbedVelocity(sourceCol, targetCol, flightTimeMs);
  return {
    instanceId,
    projectileType,
    lane: sourceLane,
    x: sourceCol + 0.5,
    y: 0,
    velX,
    velY,
    damage,
    trajectory: "lobbed",
    sourceCol,
    targetCol,
    targetLane,
  };
}
