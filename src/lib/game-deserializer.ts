// ---------------------------------------------------------------------------
// game-deserializer.ts
// Converts DB GameSession columns → Partial<GameEngineState> for store merge.
// ---------------------------------------------------------------------------

import type { GameEngineState, EnvironmentConfig, RuntimePlant, RuntimeZombie, RuntimeStatusEffect, SeedPacketSlot } from "@/engine/types";
import type { GridCell, ZombieInstance, SeedCooldowns } from "@/types/game";
import { isGridState, isZombieState } from "@/types/game";
import { generateGrid } from "@/engine/grid";
import { getPlantDef } from "@/engine/entities/plant-defs";
import { getZombieDef } from "@/engine/entities/zombie-defs";
import type { EnvironmentType } from "@/engine/types";

// ---------------------------------------------------------------------------
// Session shape expected from DB
// ---------------------------------------------------------------------------

interface SessionData {
  gridState: unknown;
  zombieState: unknown;
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
}

// ---------------------------------------------------------------------------
// deserializeGameState
// ---------------------------------------------------------------------------

export function deserializeGameState(
  session: SessionData,
  currentGameTimeMs: number
): Partial<GameEngineState> {
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
  const gridState = isGridState(session.gridState) ? session.gridState : ([] as GridCell[][]);
  const zombieStateRaw = isZombieState(session.zombieState) ? session.zombieState : [];
  const seedCooldownsRaw = isSeedCooldowns(session.seedCooldowns) ? session.seedCooldowns : {};
  const loadoutSnapshotRaw = isStringArray(session.loadoutSnapshot) ? session.loadoutSnapshot : [];

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
        };

        plants[entity.instanceId] = plant;

        // Wire up grid cell pointers based on layer
        if (entity.layer === "WATER") {
          // Lily pad
          gridCell.lilyPadInstanceId = entity.instanceId;
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
        : currentGameTimeMs + effect.remainingMs,
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
    };

    zombies[z.instanceId] = zombie;
  }

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
    projectiles: {},
    sunDrops: {},
    currentSun: session.currentSun,
    cumulativeSun: session.cumulativeSun,
    score: session.score,
    waveNumber: session.waveNumber,
    nextWaveAtMs: currentGameTimeMs + session.nextWaveTimerMs,
    totalZombiesKilled: session.totalZombiesKilled,
    loadout,
    selectedSlot: null,
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
