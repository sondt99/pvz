// ---------------------------------------------------------------------------
// game-serializer.ts
// Converts Zustand runtime GameEngineState → DB-ready columns for GameSession.
// ---------------------------------------------------------------------------

import type {
  GameEngineState,
  RuntimeLawnMower,
  RuntimeProjectile,
  RuntimeSunDrop,
  RuntimeZombie,
} from "@/engine/types";
import type { GridCell, StackedEntity, ZombieInstance, SeedCooldowns } from "@/types/game";

export interface SerializedGridCellEnvironment {
  row: number;
  col: number;
  isWater: boolean;
  isFog: boolean;
  isSlope: boolean;
  graveId: string | null;
  craterExpiresAtMs?: number | null;
}

export interface SerializedEnvironmentState {
  gridCells: SerializedGridCellEnvironment[];
  nextSkyDropTimerMs: number;
  rngState?: number;
}

export interface SerializedGraveState {
  row: number;
  col: number;
  graveId: string;
}

export type SerializedSpawnQueue = GameEngineState["zombieSpawnQueue"];

export interface SerializedGameState {
  gameTimeMs: number;
  environmentState: SerializedEnvironmentState;
  graveState: SerializedGraveState[];
  gridState: GridCell[][];
  zombieState: ZombieInstance[];
  projectileState: RuntimeProjectile[];
  sunDropState: RuntimeSunDrop[];
  lawnMowerState: RuntimeLawnMower[];
  spawnQueueState: SerializedSpawnQueue;
  seedCooldowns: SeedCooldowns;
  loadoutSnapshot: string[];
  currentSun: number;
  cumulativeSun: number;
  score: number;
  waveNumber: number;
  nextWaveTimerMs: number;
  totalZombiesKilled: number;
}

// ---------------------------------------------------------------------------
// serializeGameState
// ---------------------------------------------------------------------------

export function serializeGameState(state: GameEngineState): SerializedGameState {
  return {
    gameTimeMs: state.gameTimeMs,
    environmentState: serializeEnvironmentState(state),
    graveState: serializeGraves(state),
    gridState: serializeGrid(state),
    zombieState: serializeZombies(state),
    projectileState: serializeProjectiles(state),
    sunDropState: serializeSunDrops(state),
    lawnMowerState: serializeLawnMowers(state),
    spawnQueueState: serializeSpawnQueue(state),
    seedCooldowns: serializeSeedCooldowns(state),
    loadoutSnapshot: state.loadout.map((slot) => slot.plantType),
    currentSun: state.currentSun,
    cumulativeSun: state.cumulativeSun,
    score: state.score,
    waveNumber: state.waveNumber,
    nextWaveTimerMs: Math.max(0, state.nextWaveAtMs - state.gameTimeMs),
    totalZombiesKilled: state.totalZombiesKilled,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serializeEnvironmentState(state: GameEngineState): SerializedEnvironmentState {
  return {
    gridCells: state.grid.flatMap((gridRow) =>
      gridRow.map((cell) => ({
        row: cell.row,
        col: cell.col,
        isWater: cell.isWater,
        isFog: cell.isFog,
        isSlope: cell.isSlope,
        graveId: cell.graveId,
        craterExpiresAtMs: cell.craterExpiresAtMs,
      }))
    ),
    nextSkyDropTimerMs: Math.max(0, state.nextSkyDropAtMs - state.gameTimeMs),
    rngState: state.rngState,
  };
}

function serializeGraves(state: GameEngineState): SerializedGraveState[] {
  return state.grid
    .flat()
    .filter((cell) => cell.graveId !== null)
    .map((cell) => ({
      row: cell.row,
      col: cell.col,
      graveId: cell.graveId as string,
    }));
}

function serializeGrid(state: GameEngineState): GridCell[][] {
  const { grid, plants } = state;

  return grid.map((gridRow) =>
    gridRow.map((cell) => {
      const entities: StackedEntity[] = [];

      // Lily pad occupies WATER layer
      if (cell.lilyPadInstanceId !== null) {
        const lilyPlant = plants[cell.lilyPadInstanceId];
        if (lilyPlant) {
          entities.push({
            instanceId: lilyPlant.instanceId,
            entityType: "PLANT",
            entityId: lilyPlant.plantType,
            health: lilyPlant.health,
            maxHealth: lilyPlant.maxHealth,
            layer: "WATER",
            zIndex: 0,
            extraState: null,
          });
        }
      }

      // Flower pot occupies GROUND layer on slope cells (before plants)
      if (cell.flowerPotInstanceId !== null) {
        const potPlant = plants[cell.flowerPotInstanceId];
        if (potPlant) {
          entities.push({
            instanceId: potPlant.instanceId,
            entityType: "PLANT",
            entityId: potPlant.plantType,
            health: potPlant.health,
            maxHealth: potPlant.maxHealth,
            layer: "GROUND",
            zIndex: 0,
            extraState: null,
          });
        }
      }

      // Regular plant on GROUND layer
      if (cell.plantInstanceId !== null) {
        const plant = plants[cell.plantInstanceId];
        if (plant) {
          // Determine the correct layer:
          // If the cell is a water cell and has a lily pad, the plant goes on GROUND
          // (lily pad provides the platform). If the cell is a water cell and the
          // plant itself is the lily pad, it was already handled above via lilyPadInstanceId.
          const layer: StackedEntity["layer"] = "GROUND";
          const extraState: Record<string, unknown> = {};
          if (plant.armedAtMs !== null) extraState.armedAtMs = plant.armedAtMs;
          if (plant.isSleeping) extraState.isSleeping = true;
          if (plant.isCharging) extraState.isCharging = true;
          if (plant.chargeEndsAtMs !== 0) extraState.chargeEndsAtMs = plant.chargeEndsAtMs;

          entities.push({
            instanceId: plant.instanceId,
            entityType: "PLANT",
            entityId: plant.plantType,
            health: plant.health,
            maxHealth: plant.maxHealth,
            layer,
            zIndex: 1,
            extraState: Object.keys(extraState).length > 0 ? extraState : null,
          });
        }
      }

      // Pumpkin wraps the tile in a protective ARMOR layer above the regular plant.
      if (cell.pumpkinInstanceId !== null) {
        const pumpkinPlant = plants[cell.pumpkinInstanceId];
        if (pumpkinPlant) {
          entities.push({
            instanceId: pumpkinPlant.instanceId,
            entityType: "PLANT",
            entityId: pumpkinPlant.plantType,
            health: pumpkinPlant.health,
            maxHealth: pumpkinPlant.maxHealth,
            layer: "ARMOR",
            zIndex: 2,
            extraState: null,
          });
        }
      }

      return {
        row: cell.row,
        col: cell.col,
        entities,
      } satisfies GridCell;
    })
  );
}

function serializeProjectiles(state: GameEngineState): RuntimeProjectile[] {
  return Object.values(state.projectiles).map((projectile) => ({ ...projectile }));
}

function serializeSunDrops(state: GameEngineState): RuntimeSunDrop[] {
  return Object.values(state.sunDrops).map((drop) => ({ ...drop }));
}

function serializeLawnMowers(state: GameEngineState): RuntimeLawnMower[] {
  return Object.values(state.lawnMowers).map((mower) => ({ ...mower }));
}

function serializeSpawnQueue(state: GameEngineState): SerializedSpawnQueue {
  return state.zombieSpawnQueue.map((entry) => ({ ...entry }));
}

function serializeZombies(state: GameEngineState): ZombieInstance[] {
  const { zombies, gameTimeMs } = state;

  return Object.values(zombies).map((zombie: RuntimeZombie): ZombieInstance => ({
    instanceId: zombie.instanceId,
    zombieType: zombie.zombieType,
    lane: zombie.lane,
    xPosition: zombie.x,
    health: zombie.health,
    maxHealth: zombie.maxHealth,
    armorLayers: zombie.armorHealth > 0 ? 1 : 0,
    statusEffects: zombie.statusEffects.map((effect) => ({
      type: effect.type,
      remainingMs: effect.expiresAtMs === Infinity
        ? 999999
        : Math.max(0, effect.expiresAtMs - gameTimeMs),
    })),
    extraState: {
      armorHealth: zombie.armorHealth,
      isEating: zombie.isEating,
      eatTargetId: zombie.eatTargetId,
      isUnderground: zombie.isUnderground,
      isAerial: zombie.isAerial,
      isFrozen: zombie.isFrozen,
      speedColsPerSec: zombie.speedColsPerSec,
      eatDamagePerSec: zombie.eatDamagePerSec,
    },
  }));
}

function serializeSeedCooldowns(state: GameEngineState): SeedCooldowns {
  const cooldowns: SeedCooldowns = {};
  for (const slot of state.loadout) {
    cooldowns[slot.plantType.toLowerCase()] = slot.cooldownRemainingMs;
  }
  return cooldowns;
}
