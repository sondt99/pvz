// ---------------------------------------------------------------------------
// game-deserializer.ts
// Converts DB GameSession columns → Partial<GameEngineState> for store merge.
// ---------------------------------------------------------------------------

import type {
  GameEngineState,
  EnvironmentConfig,
  RuntimeLawnMower,
  RuntimePlant,
  RuntimeProjectile,
  RuntimeSunDrop,
  RuntimeZombie,
  RuntimeStatusEffect,
  SeedPacketSlot,
} from "@/engine/types";
import type { GridCell, ZombieInstance, SeedCooldowns } from "@/types/game";
import { isGridState, isZombieState } from "@/types/game";
import type {
  SerializedEnvironmentState,
  SerializedGraveState,
  SerializedSpawnQueue,
} from "@/lib/game-serializer";
import { generateGrid } from "@/engine/grid";
import { getPlantDef } from "@/engine/entities/plant-defs";
import { getZombieDef } from "@/engine/entities/zombie-defs";
import { LAWN_MOWER_READY_X, LAWN_MOWER_SPEED_COLS_PER_SEC } from "@/engine/constants";
import type { EnvironmentType } from "@/engine/types";
import { createInitialRngState, DEFAULT_RNG_SEED, normalizeRngState } from "@/engine/rng";
import { parseWaveConfig } from "@/engine/wave-generator";

// ---------------------------------------------------------------------------
// Session shape expected from DB
// ---------------------------------------------------------------------------

interface SessionData {
  gameTimeMs: number;
  environmentState: unknown;
  graveState: unknown;
  gridState: unknown;
  zombieState: unknown;
  projectileState: unknown;
  sunDropState: unknown;
  lawnMowerState: unknown;
  spawnQueueState: unknown;
  seedCooldowns: unknown;
  loadoutSnapshot: unknown;
  currentSun: number;
  cumulativeSun: number;
  score: number;
  waveNumber: number;
  nextWaveTimerMs: number;
  totalZombiesKilled: number;
  environmentType: string;
  gridRows: number;
  gridCols: number;
  waterLaneIndices: number[];
  gravesEnabled: boolean;
  fogEnabled: boolean;
  slopeEnabled: boolean;
  conveyorBelt: boolean;
  environmentConfig?: unknown;
  rngSeed?: string | null;
}

// ---------------------------------------------------------------------------
// deserializeGameState
// ---------------------------------------------------------------------------

export function deserializeGameState(
  session: SessionData,
  currentGameTimeMs: number
): Partial<GameEngineState> {
  const restoredGameTimeMs = Number.isFinite(session.gameTimeMs)
    ? session.gameTimeMs
    : currentGameTimeMs;

  // --- Environment ---
  const env: EnvironmentConfig = {
    type: session.environmentType as EnvironmentType,
    gridRows: session.gridRows,
    gridCols: session.gridCols,
    waterLaneIndices: session.waterLaneIndices,
    gravesEnabled: session.gravesEnabled,
    fogEnabled: session.fogEnabled,
    slopeEnabled: session.slopeEnabled,
    conveyorBelt: session.conveyorBelt,
    skyDropSun: session.environmentType === "DAY" || session.environmentType === "ROOF",
  };

  // --- Grid ---
  const grid = generateGrid(env);

  // --- Parse JSON columns ---
  const environmentState = isSerializedEnvironmentState(session.environmentState)
    ? session.environmentState
    : null;
  const graveState = isSerializedGraveState(session.graveState)
    ? session.graveState
    : [];
  const gridState = isGridState(session.gridState) ? session.gridState : ([] as GridCell[][]);
  const zombieStateRaw = isZombieState(session.zombieState) ? session.zombieState : [];
  const projectileStateRaw = isProjectileState(session.projectileState) ? session.projectileState : [];
  const sunDropStateRaw = isSunDropState(session.sunDropState) ? session.sunDropState : [];
  const lawnMowerStateRaw = isLawnMowerState(session.lawnMowerState) ? session.lawnMowerState : [];
  const spawnQueueStateRaw = isSpawnQueueState(session.spawnQueueState) ? session.spawnQueueState : [];
  const seedCooldownsRaw = isSeedCooldowns(session.seedCooldowns) ? session.seedCooldowns : {};
  const loadoutSnapshotRaw = isStringArray(session.loadoutSnapshot) ? session.loadoutSnapshot : [];
  const sessionEnvironmentConfig = isPlainRecord(session.environmentConfig)
    ? session.environmentConfig
    : {};
  const waveConfig = parseWaveConfig(
    environmentState?.waveConfig ?? sessionEnvironmentConfig.waveConfig
  );

  // --- Restore environment mutations like fog reveal and graves ---
  if (environmentState) {
    for (const cellState of environmentState.gridCells) {
      const gridCell = grid[cellState.row]?.[cellState.col];
      if (!gridCell) continue;

      gridCell.isWater = cellState.isWater;
      gridCell.isFog = cellState.isFog;
      gridCell.isSlope = cellState.isSlope;
      gridCell.graveId = cellState.graveId;
      gridCell.craterExpiresAtMs = cellState.craterExpiresAtMs ?? null;
    }
  }

  for (const grave of graveState) {
    const gridCell = grid[grave.row]?.[grave.col];
    if (!gridCell) continue;
    gridCell.graveId = grave.graveId;
  }

  // --- Reconstruct plants from gridState entities ---
  const plants: Record<string, RuntimePlant> = {};

  for (const gridRow of gridState) {
    for (const cell of gridRow) {
      const gridCell = grid[cell.row]?.[cell.col];
      if (!gridCell) continue;

      for (const entity of cell.entities) {
        if (entity.entityType !== "PLANT") continue;

        const plantType = entity.entityId;
        let def;
        try {
          def = getPlantDef(plantType);
        } catch {
          // Unknown plant type — skip
          continue;
        }

        const extra = entity.extraState ?? {};
        const plant: RuntimePlant = {
          instanceId: entity.instanceId,
          plantType,
          row: cell.row,
          col: cell.col,
          health: entity.health,
          maxHealth: entity.maxHealth,
          lastAttackAtMs: 0,
          lastSunAtMs: 0,
          isSleeping: typeof extra.isSleeping === "boolean" ? extra.isSleeping : false,
          isCharging: typeof extra.isCharging === "boolean" ? extra.isCharging : false,
          chargeEndsAtMs: typeof extra.chargeEndsAtMs === "number" ? extra.chargeEndsAtMs : 0,
          armedAtMs: typeof extra.armedAtMs === "number" ? extra.armedAtMs : null,
          blocksAerial: def.blocksAerial,
        };

        plants[entity.instanceId] = plant;

        // Wire up grid cell pointers based on layer
        if (entity.layer === "WATER") {
          // Lily pad
          gridCell.lilyPadInstanceId = entity.instanceId;
        } else if (entity.layer === "ARMOR" || def.plantType === "PUMPKIN") {
          // Pumpkin shell around the cell, including old saves that stored it as GROUND.
          gridCell.pumpkinInstanceId = entity.instanceId;
        } else if (entity.layer === "GROUND" && def.plantType === "FLOWER_POT") {
          // Flower pot on slope
          gridCell.flowerPotInstanceId = entity.instanceId;
        } else if (entity.layer === "GROUND") {
          gridCell.plantInstanceId = entity.instanceId;
        }
      }
    }
  }

  // --- Reconstruct zombies ---
  const zombies: Record<string, RuntimeZombie> = {};

  for (const z of zombieStateRaw as ZombieInstance[]) {
    let def;
    try {
      def = getZombieDef(z.zombieType);
    } catch {
      continue;
    }

    const extra = z.extraState ?? {};
    const statusEffects: RuntimeStatusEffect[] = z.statusEffects.map((effect) => ({
      type: effect.type,
      expiresAtMs: effect.remainingMs >= 999999
        ? Infinity
        : restoredGameTimeMs + effect.remainingMs,
    }));

    const zombie: RuntimeZombie = {
      instanceId: z.instanceId,
      zombieType: z.zombieType,
      lane: z.lane,
      x: z.xPosition,
      health: z.health,
      maxHealth: z.maxHealth,
      armorHealth: typeof extra.armorHealth === "number" ? extra.armorHealth : def.armorHealth,
      speedColsPerSec: typeof extra.speedColsPerSec === "number" ? extra.speedColsPerSec : def.speedColsPerSec,
      eatDamagePerSec: typeof extra.eatDamagePerSec === "number" ? extra.eatDamagePerSec : def.eatDamagePerSec,
      isEating: typeof extra.isEating === "boolean" ? extra.isEating : false,
      eatTargetId: typeof extra.eatTargetId === "string" ? extra.eatTargetId : null,
      statusEffects,
      isUnderground: typeof extra.isUnderground === "boolean" ? extra.isUnderground : def.isUnderground,
      isAerial: typeof extra.isAerial === "boolean" ? extra.isAerial : def.isAerial,
      isFrozen: typeof extra.isFrozen === "boolean" ? extra.isFrozen : false,
      isSubmerged: typeof extra.isSubmerged === "boolean" ? extra.isSubmerged : false,
      hasJumped: typeof extra.hasJumped === "boolean" ? extra.hasJumped : undefined,
      direction: extra.direction === "right" ? "right" : "left",
      emergeUntilMs: typeof extra.emergeUntilMs === "number" ? extra.emergeUntilMs : undefined,
      pogoStickActive: typeof extra.pogoStickActive === "boolean" ? extra.pogoStickActive : undefined,
      hasThrownImp: typeof extra.hasThrownImp === "boolean" ? extra.hasThrownImp : undefined,
      smashUntilMs: typeof extra.smashUntilMs === "number" ? extra.smashUntilMs : undefined,
    };

    zombies[z.instanceId] = zombie;
  }

  // --- Reconstruct volatile runtime records ---
  const projectiles = toRecordByInstanceId(projectileStateRaw);
  const sunDrops = toRecordByInstanceId(sunDropStateRaw);
  const lawnMowers = lawnMowerStateRaw.length > 0
    ? toRecordByInstanceId(lawnMowerStateRaw)
    : createDefaultLawnMowers(env);
  const zombieSpawnQueue = spawnQueueStateRaw.map((entry) => ({ ...entry }));

  const nextSkyDropTimerMs = environmentState?.nextSkyDropTimerMs ?? 0;
  const rngState = environmentState?.rngState !== undefined
    ? normalizeRngState(environmentState.rngState)
    : session.rngSeed
      ? createInitialRngState([session.rngSeed, env, loadoutSnapshotRaw, waveConfig])
      : DEFAULT_RNG_SEED;

  // --- Reconstruct loadout ---
  const loadout: SeedPacketSlot[] = loadoutSnapshotRaw.map((plantType, index) => {
    let def;
    try {
      def = getPlantDef(plantType);
    } catch {
      // Fallback for unknown plant types
      return {
        plantType,
        plantId: plantType.toLowerCase(),
        sunCost: 0,
        cooldownRemainingMs: 0,
        cooldownTotalMs: 0,
        isSelected: false,
        slotIndex: index,
      } satisfies SeedPacketSlot;
    }

    const key = plantType.toLowerCase();
    const cooldownRemainingMs = (seedCooldownsRaw as SeedCooldowns)[key] ?? 0;

    return {
      plantType,
      plantId: key,
      sunCost: def.sunCost,
      cooldownRemainingMs,
      cooldownTotalMs: def.rechargeTime * 1000,
      isSelected: false,
      slotIndex: index,
    } satisfies SeedPacketSlot;
  });

  return {
    environment: env,
    grid,
    plants,
    zombies,
    projectiles,
    sunDrops,
    lawnMowers,
    currentSun: session.currentSun,
    cumulativeSun: session.cumulativeSun,
    gameTimeMs: restoredGameTimeMs,
    score: session.score,
    waveNumber: session.waveNumber,
    nextWaveAtMs: restoredGameTimeMs + session.nextWaveTimerMs,
    rngState,
    totalZombiesKilled: session.totalZombiesKilled,
    loadout,
    selectedSlot: null,
    nextSkyDropAtMs: restoredGameTimeMs + nextSkyDropTimerMs,
    waveConfig,
    zombieSpawnQueue,
  };
}

// ---------------------------------------------------------------------------
// Type guards for raw JSON fields
// ---------------------------------------------------------------------------

function isSeedCooldowns(v: unknown): v is SeedCooldowns {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  return Object.values(v as Record<string, unknown>).every((val) => typeof val === "number");
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && (v as unknown[]).every((item) => typeof item === "string");
}

function isSerializedEnvironmentState(v: unknown): v is SerializedEnvironmentState {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const state = v as Record<string, unknown>;
  return (
    typeof state.nextSkyDropTimerMs === "number" &&
    (state.rngState === undefined || typeof state.rngState === "number") &&
    Array.isArray(state.gridCells) &&
    state.gridCells.every(isSerializedGridCellEnvironment)
  );
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isSerializedGridCellEnvironment(v: unknown): boolean {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const cell = v as Record<string, unknown>;
  return (
    typeof cell.row === "number" &&
    typeof cell.col === "number" &&
    typeof cell.isWater === "boolean" &&
    typeof cell.isFog === "boolean" &&
    typeof cell.isSlope === "boolean" &&
    (typeof cell.graveId === "string" || cell.graveId === null) &&
    (
      typeof cell.craterExpiresAtMs === "number" ||
      cell.craterExpiresAtMs === null ||
      cell.craterExpiresAtMs === undefined
    )
  );
}

function isSerializedGraveState(v: unknown): v is SerializedGraveState[] {
  return Array.isArray(v) && v.every((grave) => {
    if (typeof grave !== "object" || grave === null || Array.isArray(grave)) return false;
    const g = grave as Record<string, unknown>;
    return (
      typeof g.row === "number" &&
      typeof g.col === "number" &&
      typeof g.graveId === "string"
    );
  });
}

function isProjectileState(v: unknown): v is RuntimeProjectile[] {
  return Array.isArray(v) && v.every((projectile) => {
    if (typeof projectile !== "object" || projectile === null || Array.isArray(projectile)) {
      return false;
    }
    const p = projectile as Record<string, unknown>;
    return (
      typeof p.instanceId === "string" &&
      typeof p.projectileType === "string" &&
      typeof p.lane === "number" &&
      typeof p.x === "number" &&
      typeof p.y === "number" &&
      typeof p.velX === "number" &&
      typeof p.velY === "number" &&
      typeof p.damage === "number" &&
      (p.trajectory === "straight" || p.trajectory === "lobbed") &&
      typeof p.sourceCol === "number"
    );
  });
}

function isSunDropState(v: unknown): v is RuntimeSunDrop[] {
  return Array.isArray(v) && v.every((drop) => {
    if (typeof drop !== "object" || drop === null || Array.isArray(drop)) return false;
    const d = drop as Record<string, unknown>;
    return (
      typeof d.instanceId === "string" &&
      typeof d.x === "number" &&
      typeof d.y === "number" &&
      typeof d.targetY === "number" &&
      typeof d.value === "number" &&
      (d.source === "sky" || d.source === "plant") &&
      (d.state === "falling" || d.state === "landed" || d.state === "collected") &&
      typeof d.spawnedAtMs === "number" &&
      typeof d.lifetimeMs === "number"
    );
  });
}

function isLawnMowerState(v: unknown): v is RuntimeLawnMower[] {
  return Array.isArray(v) && v.every((mower) => {
    if (typeof mower !== "object" || mower === null || Array.isArray(mower)) return false;
    const m = mower as Record<string, unknown>;
    return (
      typeof m.instanceId === "string" &&
      typeof m.lane === "number" &&
      typeof m.x === "number" &&
      (m.state === "ready" || m.state === "active" || m.state === "spent") &&
      typeof m.speedColsPerSec === "number" &&
      (typeof m.triggeredAtMs === "number" || m.triggeredAtMs === null)
    );
  });
}

function isSpawnQueueState(v: unknown): v is SerializedSpawnQueue {
  return Array.isArray(v) && v.every((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return false;
    const q = entry as Record<string, unknown>;
    return (
      typeof q.zombieType === "string" &&
      typeof q.lane === "number" &&
      typeof q.spawnAtMs === "number" &&
      (typeof q.x === "number" || q.x === undefined)
    );
  });
}

function toRecordByInstanceId<T extends { instanceId: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.instanceId, { ...item }]));
}

function createDefaultLawnMowers(env: EnvironmentConfig): Record<string, RuntimeLawnMower> {
  return Object.fromEntries(
    Array.from({ length: env.gridRows }, (_, lane) => {
      const instanceId = `mower-${lane}`;
      return [
        instanceId,
        {
          instanceId,
          lane,
          x: LAWN_MOWER_READY_X,
          state: "ready",
          speedColsPerSec: LAWN_MOWER_SPEED_COLS_PER_SEC,
          triggeredAtMs: null,
        } satisfies RuntimeLawnMower,
      ];
    })
  );
}
