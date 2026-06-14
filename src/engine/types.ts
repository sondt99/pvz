// ---------------------------------------------------------------------------
// Runtime in-memory types for the PvZ game engine.
// Distinct from src/types/game.ts (DB serialization types).
// ---------------------------------------------------------------------------

export type GameStatus = "idle" | "playing" | "paused" | "victory" | "game-over";

export type EnvironmentType = "DAY" | "NIGHT" | "POOL" | "FOG" | "ROOF";

export interface EnvironmentConfig {
  type: EnvironmentType;
  gridRows: number;
  gridCols: number;
  waterLaneIndices: number[];
  gravesEnabled: boolean;
  fogEnabled: boolean;
  slopeEnabled: boolean;
  conveyorBelt: boolean;
  skyDropSun: boolean;
}

export type TrajectoryType = "straight" | "lobbed";
export type AttackRange = "lane" | "aoe" | "none";

export interface PlantDefinition {
  plantType: string;
  sunCost: number;
  rechargeTime: number; // seconds
  health: number;
  attackDamage: number | null;
  attackCooldownMs: number | null;
  attackRange: AttackRange;
  projectileType: string | null;
  trajectory: TrajectoryType | null;
  isAquatic: boolean;
  requiresLilyPad: boolean;
  requiresFlowerPot: boolean;
  isInstantUse: boolean;
  produceSun: boolean;
  sunProduceIntervalMs: number | null;
  sunProduceAmount: number | null;
  isNightOnly: boolean;
  isMushroomType: boolean;
  blocksAerial: boolean;
  revealsFog: boolean;
  divertsZombies: boolean;
}

export interface ZombieDefinition {
  zombieType: string;
  health: number;
  armorHealth: number;
  armorLayers: number;
  speedColsPerSec: number;
  eatDamagePerSec: number;
  scoreValue: number;
  isAerial: boolean;
  isUnderground: boolean;
  isBoss: boolean;
}

export interface RuntimeGridCell {
  row: number;
  col: number;
  isWater: boolean;
  isFog: boolean;
  isSlope: boolean;
  plantInstanceId: string | null;
  lilyPadInstanceId: string | null;
  flowerPotInstanceId: string | null;
  pumpkinInstanceId: string | null;
  graveId: string | null;
  craterExpiresAtMs: number | null;
}

export type StatusEffectType =
  | "FROZEN"
  | "SLOWED"
  | "BURNING"
  | "HYPNOTIZED"
  | "BUTTERED";

export interface RuntimeStatusEffect {
  type: StatusEffectType;
  expiresAtMs: number;
  factor?: number; // SLOWED: fraction of normal speed
}

export interface RuntimeProjectileStatusEffect {
  type: StatusEffectType;
  durationMs: number;
  factor?: number;
}

export interface RuntimePlant {
  instanceId: string;
  plantType: string;
  row: number;
  col: number;
  health: number;
  maxHealth: number;
  lastAttackAtMs: number;
  lastSunAtMs: number;
  isSleeping: boolean;
  isCharging: boolean;
  chargeEndsAtMs: number;
  armedAtMs: number | null; // Potato Mine arm timestamp
}

export interface RuntimeZombie {
  instanceId: string;
  zombieType: string;
  lane: number;
  x: number; // fractional column (9.5 = off-screen, 0 = house)
  health: number;
  maxHealth: number;
  armorHealth: number;
  speedColsPerSec: number;
  eatDamagePerSec: number;
  isEating: boolean;
  eatTargetId: string | null;
  statusEffects: RuntimeStatusEffect[];
  isUnderground: boolean;
  isAerial: boolean;
  isFrozen: boolean;
  isSubmerged?: boolean;
  hasJumped?: boolean;
  direction?: "left" | "right";
  emergeUntilMs?: number;
  pogoStickActive?: boolean;
  hasThrownImp?: boolean;
  smashUntilMs?: number;
}

export interface RuntimeProjectile {
  instanceId: string;
  projectileType: string;
  lane: number;
  x: number;
  y: number; // vertical offset (0 = ground)
  velX: number; // cols/s
  velLane?: number; // rows/s, used by diagonal/vertical straight projectiles
  velY: number; // cols/s, lobbed only
  damage: number;
  trajectory: TrajectoryType;
  slowFactor?: number;
  isFire?: boolean;
  piercing?: boolean;
  canHitAerial?: boolean;
  maxTravelDistanceCols?: number;
  statusEffectOnHit?: RuntimeProjectileStatusEffect;
  sourceCol: number;
  sourceLane?: number;
  targetCol?: number;
  targetLane?: number;
}

export interface RuntimeSunDrop {
  instanceId: string;
  x: number; // column position
  y: number; // row position
  targetY: number;
  value: number;
  source: "sky" | "plant";
  state: "falling" | "landed" | "collected";
  spawnedAtMs: number;
  lifetimeMs: number;
}

export type RuntimeLawnMowerState = "ready" | "active" | "spent";

export interface RuntimeLawnMower {
  instanceId: string;
  lane: number;
  x: number;
  state: RuntimeLawnMowerState;
  speedColsPerSec: number;
  triggeredAtMs: number | null;
}

export interface SeedPacketSlot {
  plantType: string;
  plantId: string;
  sunCost: number;
  cooldownRemainingMs: number;
  cooldownTotalMs: number;
  isSelected: boolean;
  slotIndex: number;
}

export interface GameEngineState {
  status: GameStatus;
  environment: EnvironmentConfig;
  grid: RuntimeGridCell[][];
  plants: Record<string, RuntimePlant>;
  zombies: Record<string, RuntimeZombie>;
  projectiles: Record<string, RuntimeProjectile>;
  sunDrops: Record<string, RuntimeSunDrop>;
  lawnMowers: Record<string, RuntimeLawnMower>;
  currentSun: number;
  cumulativeSun: number;
  gameTimeMs: number;
  waveNumber: number;
  nextWaveAtMs: number;
  rngState: number;
  score: number;
  totalZombiesKilled: number;
  loadout: SeedPacketSlot[];
  selectedSlot: number | null;
  nextSkyDropAtMs: number;
  zombieSpawnQueue: Array<{
    zombieType: string;
    lane: number;
    spawnAtMs: number;
    x?: number;
  }>;
}
