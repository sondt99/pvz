export type StatusEffectType =
  | "FROZEN"
  | "SLOWED"
  | "BURNING"
  | "HYPNOTIZED"
  | "BUTTERED";

export interface StatusEffect {
  type: StatusEffectType;
  remainingMs: number;
}

export interface StackedEntity {
  instanceId: string;
  entityType: "PLANT" | "ZOMBIE" | "PROJECTILE";
  entityId: string;
  health: number;
  maxHealth: number;
  layer: "GROUND" | "WATER" | "ARMOR" | "SKY" | "GRAVE" | "RAIL";
  zIndex: number;
  extraState: Record<string, unknown> | null;
}

export interface GridCell {
  row: number;
  col: number;
  entities: StackedEntity[];
}

export type GridState = GridCell[][];

export interface ZombieInstance {
  instanceId: string;
  zombieType: string;
  lane: number;
  xPosition: number;
  health: number;
  maxHealth: number;
  armorLayers: number;
  statusEffects: StatusEffect[];
  extraState: Record<string, unknown> | null;
}

export type ZombieState = ZombieInstance[];

export type SeedCooldowns = Record<string, number>;

export type LoadoutSnapshot = string[];

export type UnlockRequirement =
  | { type: "noRequirement" }
  | { type: "completePrevious" }
  | { type: "completeWithStars"; levelNumber: number; stars: number };

export function isStackedEntity(v: unknown): v is StackedEntity {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.instanceId === "string" &&
    (e.entityType === "PLANT" ||
      e.entityType === "ZOMBIE" ||
      e.entityType === "PROJECTILE") &&
    typeof e.entityId === "string" &&
    typeof e.health === "number" &&
    typeof e.maxHealth === "number" &&
    (e.layer === "GROUND" ||
      e.layer === "WATER" ||
      e.layer === "ARMOR" ||
      e.layer === "SKY" ||
      e.layer === "GRAVE" ||
      e.layer === "RAIL") &&
    typeof e.zIndex === "number"
  );
}

export function isGridCell(v: unknown): v is GridCell {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.row === "number" &&
    typeof c.col === "number" &&
    Array.isArray(c.entities) &&
    (c.entities as unknown[]).every(isStackedEntity)
  );
}

export function isGridState(v: unknown): v is GridState {
  return (
    Array.isArray(v) &&
    (v as unknown[]).every((row) =>
      Array.isArray(row) && (row as unknown[]).every(isGridCell)
    )
  );
}

export function isZombieInstance(v: unknown): v is ZombieInstance {
  if (typeof v !== "object" || v === null) return false;
  const z = v as Record<string, unknown>;
  return (
    typeof z.instanceId === "string" &&
    typeof z.zombieType === "string" &&
    typeof z.lane === "number" &&
    typeof z.xPosition === "number" &&
    typeof z.health === "number" &&
    typeof z.maxHealth === "number" &&
    typeof z.armorLayers === "number" &&
    Array.isArray(z.statusEffects)
  );
}

export function isZombieState(v: unknown): v is ZombieState {
  return Array.isArray(v) && (v as unknown[]).every(isZombieInstance);
}
