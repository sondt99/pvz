import { create } from "zustand";
import type {
  GameEngineState,
  EnvironmentConfig,
  RuntimeLawnMower,
  RuntimePlant,
  RuntimeZombie,
  SeedPacketSlot,
} from "../engine/types";
import {
  generateGrid,
  getCell,
  canPlantHere,
  setFlowerPotOnCell,
  setLilyPadOnCell,
  setPlantOnCell,
  setPumpkinOnCell,
} from "../engine/grid";
import { getInitialSun, tickSkySun, spendSun, collectSun, createSkySunDrop, advanceSunDrop, isSunDropExpired } from "../engine/sun";
import { getPlantDef } from "../engine/entities/plant-defs";
import { getZombieDef } from "../engine/entities/zombie-defs";
import {
  DIGGER_EMERGE_PAUSE_MS,
  DIGGER_EMERGE_X,
  DIGGER_EMERGED_SPEED_COLS_PER_SEC,
  DOOM_SHROOM_CRATER_MS,
  DOOM_SHROOM_RADIUS_COLS,
  DOOM_SHROOM_RADIUS_LANES,
  DOLPHIN_RIDER_POST_JUMP_SPEED_COLS_PER_SEC,
  LAWN_MOWER_READY_X,
  LAWN_MOWER_SPEED_COLS_PER_SEC,
  LAWN_MOWER_TRIGGER_X,
  POGO_WITHOUT_STICK_SPEED_COLS_PER_SEC,
  POTATO_MINE_ARM_MS,
  SKY_SUN_INTERVAL_MS,
  SKY_SUN_FALL_SPEED_PER_MS,
  SUN_PRODUCER_INITIAL_DELAY_MS,
  WAVE_INTERVAL_MS,
  ZOMBIE_SPAWN_X,
} from "../engine/constants";
import { resetPlantAiCounters, shouldPlantAttack, plantFire, plantProduceSun } from "../engine/ai/plant-ai";
import {
  tickStatusEffects,
  isZombieEatingPlant,
  startEating,
  stopEating,
  applyEatingDamage,
  moveZombie,
  isZombieImmobilized,
} from "../engine/ai/zombie-ai";
import {
  advanceProjectile,
  shouldRemoveProjectile,
  findStraightHits,
  findLobbedHits,
  applyProjectileHits,
  transformProjectileWithTorchwood,
} from "../engine/ai/projectile-ai";
import { generateWave } from "../engine/wave-generator";
import { applyProjectileDamage, isPlantDead, isZombieDead } from "../engine/physics/collision";
import { createInitialRngState, DEFAULT_RNG_SEED, nextRandomValue } from "../engine/rng";

// ---------------------------------------------------------------------------
// Module-level counters give stable deterministic IDs within a session.
// They are reset when the store is reset().
// ---------------------------------------------------------------------------
let _plantCounter = 0;
let _zombieCounter = 0;
let _sunDropCounter = 0;

function nextPlantId(type: string, row: number, col: number): string {
  return `plant-${++_plantCounter}-${type}-${row}-${col}`;
}
function nextZombieId(type: string): string {
  return `zombie-${++_zombieCounter}-${type}`;
}
function nextSunId(): string {
  return `sun-${++_sunDropCounter}`;
}

function isLilyPadPlant(plantType: string): boolean {
  return plantType === "LILY_PAD";
}

function isFlowerPotPlant(plantType: string): boolean {
  return plantType === "FLOWER_POT";
}

function isPumpkinPlant(plantType: string): boolean {
  return plantType === "PUMPKIN";
}

function getZombieEatPriority(plantType: string): number {
  if (isLilyPadPlant(plantType) || isFlowerPotPlant(plantType)) return 0;
  if (plantType === "PUMPKIN") return 2;
  return 1;
}

function chooseZombieEatTarget(
  zombie: RuntimeZombie,
  plants: Record<string, RuntimePlant>
): RuntimePlant | null {
  let target: RuntimePlant | null = null;
  for (const plant of Object.values(plants)) {
    if (plant.plantType === "SPIKEWEED") continue;
    if (!isZombieEatingPlant(zombie, plant)) continue;
    if (target === null) {
      target = plant;
      continue;
    }
    if (getZombieEatPriority(plant.plantType) > getZombieEatPriority(target.plantType)) {
      target = plant;
    }
  }
  return target;
}

function chooseGarlicDiversionLane(zombie: RuntimeZombie, gridRows: number): number {
  const candidates = [zombie.lane - 1, zombie.lane + 1].filter(
    (lane) => lane >= 0 && lane < gridRows
  );
  if (candidates.length === 0) return zombie.lane;
  if (candidates.length === 1) return candidates[0];

  const hash = zombie.instanceId
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return candidates[hash % candidates.length];
}

function isAquaticZombieType(zombieType: string): boolean {
  return zombieType === "DUCKY_TUBE" || zombieType === "SNORKEL" || zombieType === "DOLPHIN_RIDER";
}

function isWaterLane(env: EnvironmentConfig, lane: number): boolean {
  return env.waterLaneIndices.includes(lane);
}

function resolveAquaticSpawnLane(
  zombieType: string,
  lane: number,
  env: EnvironmentConfig
): number {
  if (!isAquaticZombieType(zombieType) || env.waterLaneIndices.length === 0) return lane;
  if (isWaterLane(env, lane)) return lane;
  return env.waterLaneIndices[Math.abs(lane) % env.waterLaneIndices.length] ?? lane;
}

function shouldSnorkelSubmerge(zombie: RuntimeZombie, env: EnvironmentConfig): boolean {
  return zombie.zombieType === "SNORKEL" && !zombie.isEating && isWaterLane(env, zombie.lane);
}

function hasTallNutInCell(
  plant: RuntimePlant,
  plants: Record<string, RuntimePlant>
): boolean {
  return Object.values(plants).some((candidate) =>
    candidate.row === plant.row &&
    candidate.col === plant.col &&
    candidate.plantType === "TALL_NUT"
  );
}

function canDolphinJumpTarget(
  zombie: RuntimeZombie,
  plant: RuntimePlant,
  env: EnvironmentConfig,
  plants: Record<string, RuntimePlant>
): boolean {
  return (
    zombie.zombieType === "DOLPHIN_RIDER" &&
    zombie.hasJumped !== true &&
    isWaterLane(env, zombie.lane) &&
    !hasTallNutInCell(plant, plants)
  );
}

function jumpDolphinOverPlant(zombie: RuntimeZombie, plant: RuntimePlant): RuntimeZombie {
  return {
    ...zombie,
    x: Math.min(zombie.x, plant.col - 0.65),
    hasJumped: true,
    speedColsPerSec: DOLPHIN_RIDER_POST_JUMP_SPEED_COLS_PER_SEC,
    isEating: false,
    eatTargetId: null,
  };
}

function isPogoStickActive(zombie: RuntimeZombie): boolean {
  return zombie.zombieType === "POGO" && zombie.pogoStickActive !== false;
}

function canPogoJumpTarget(
  zombie: RuntimeZombie,
  plant: RuntimePlant,
  plants: Record<string, RuntimePlant>
): boolean {
  return isPogoStickActive(zombie) && !hasTallNutInCell(plant, plants);
}

function jumpPogoOverPlant(zombie: RuntimeZombie, plant: RuntimePlant): RuntimeZombie {
  return {
    ...zombie,
    x: Math.min(zombie.x, plant.col - 0.65),
    isEating: false,
    eatTargetId: null,
  };
}

function removePogoStick(zombie: RuntimeZombie): RuntimeZombie {
  return {
    ...zombie,
    pogoStickActive: false,
    speedColsPerSec: POGO_WITHOUT_STICK_SPEED_COLS_PER_SEC,
  };
}

function shouldDiggerEmerge(zombie: RuntimeZombie): boolean {
  return zombie.zombieType === "DIGGER" && zombie.isUnderground && zombie.x <= DIGGER_EMERGE_X;
}

function emergeDigger(zombie: RuntimeZombie, gameTimeMs: number): RuntimeZombie {
  return {
    ...zombie,
    x: DIGGER_EMERGE_X,
    isUnderground: false,
    direction: "right",
    emergeUntilMs: gameTimeMs + DIGGER_EMERGE_PAUSE_MS,
    speedColsPerSec: DIGGER_EMERGED_SPEED_COLS_PER_SEC,
    isEating: false,
    eatTargetId: null,
  };
}

function isDiggerEmerging(zombie: RuntimeZombie, gameTimeMs: number): boolean {
  return (
    zombie.zombieType === "DIGGER" &&
    typeof zombie.emergeUntilMs === "number" &&
    gameTimeMs < zombie.emergeUntilMs
  );
}

function hasDiggerExitedLawn(zombie: RuntimeZombie, env: EnvironmentConfig): boolean {
  return zombie.zombieType === "DIGGER" && zombie.direction === "right" && zombie.x > env.gridCols + 0.5;
}

function setPlantInCorrectSlot(
  grid: GameEngineState["grid"],
  row: number,
  col: number,
  plantType: string,
  instanceId: string | null
): void {
  if (isLilyPadPlant(plantType)) {
    setLilyPadOnCell(grid, row, col, instanceId);
    return;
  }
  if (isFlowerPotPlant(plantType)) {
    setFlowerPotOnCell(grid, row, col, instanceId);
    return;
  }
  if (isPumpkinPlant(plantType)) {
    setPumpkinOnCell(grid, row, col, instanceId);
    return;
  }
  setPlantOnCell(grid, row, col, instanceId);
}

function clearFogAround(
  grid: GameEngineState["grid"],
  row: number,
  col: number
): void {
  for (const gridRow of grid) {
    for (const cell of gridRow) {
      if (Math.abs(cell.row - row) <= 2 && Math.abs(cell.col - col) <= 3) {
        cell.isFog = false;
      }
    }
  }
}

function clearAllFog(grid: GameEngineState["grid"]): void {
  for (const row of grid) {
    for (const cell of row) {
      cell.isFog = false;
    }
  }
}

function lawnMowerId(lane: number): string {
  return `mower-${lane}`;
}

function createLawnMowers(env: EnvironmentConfig): Record<string, RuntimeLawnMower> {
  return Object.fromEntries(
    Array.from({ length: env.gridRows }, (_, lane) => [
      lawnMowerId(lane),
      {
        instanceId: lawnMowerId(lane),
        lane,
        x: LAWN_MOWER_READY_X,
        state: "ready",
        speedColsPerSec: LAWN_MOWER_SPEED_COLS_PER_SEC,
        triggeredAtMs: null,
      } satisfies RuntimeLawnMower,
    ])
  );
}

function advanceLawnMowers(
  lawnMowers: Record<string, RuntimeLawnMower>,
  deltaMs: number,
  gridCols: number
): Record<string, RuntimeLawnMower> {
  const updated: Record<string, RuntimeLawnMower> = {};
  for (const [id, mower] of Object.entries(lawnMowers)) {
    if (mower.state !== "active") {
      updated[id] = mower;
      continue;
    }

    const x = mower.x + mower.speedColsPerSec * (deltaMs / 1000);
    updated[id] = {
      ...mower,
      x,
      state: x > gridCols + 0.75 ? "spent" : "active",
    };
  }
  return updated;
}

function clearZombiesByPredicate(
  zombies: Record<string, RuntimeZombie>,
  predicate: (zombie: RuntimeZombie) => boolean
): {
  zombies: Record<string, RuntimeZombie>;
  scoreDelta: number;
  killedCount: number;
} {
  let updated = { ...zombies };
  let scoreDelta = 0;
  let killedCount = 0;

  for (const [id, zombie] of Object.entries(zombies)) {
    if (!predicate(zombie)) continue;
    scoreDelta += scoreKilledZombie(zombie);
    killedCount += 1;
    const { [id]: _killed, ...rest } = updated;
    updated = rest;
  }

  return { zombies: updated, scoreDelta, killedCount };
}

function clearActiveLawnMowerHits(
  zombies: Record<string, RuntimeZombie>,
  lawnMowers: Record<string, RuntimeLawnMower>
): {
  zombies: Record<string, RuntimeZombie>;
  scoreDelta: number;
  killedCount: number;
} {
  return clearZombiesByPredicate(zombies, (zombie) =>
    Object.values(lawnMowers).some(
      (mower) =>
        mower.state === "active" &&
        mower.lane === zombie.lane &&
        zombie.x <= mower.x + 0.45
    )
  );
}

function scoreKilledZombie(zombie: RuntimeZombie): number {
  try {
    return getZombieDef(zombie.zombieType).scoreValue;
  } catch {
    return 0;
  }
}

function damageZombiesInArea(
  zombies: Record<string, RuntimeZombie>,
  predicate: (zombie: RuntimeZombie) => boolean,
  damage: number
): {
  zombies: Record<string, RuntimeZombie>;
  scoreDelta: number;
  killedCount: number;
} {
  let updated = { ...zombies };
  let scoreDelta = 0;
  let killedCount = 0;

  for (const [id, zombie] of Object.entries(updated)) {
    if (zombie.isUnderground || !predicate(zombie)) continue;
    const damaged = applyProjectileDamage(zombie, damage);
    if (isZombieDead(damaged)) {
      scoreDelta += scoreKilledZombie(zombie);
      killedCount += 1;
      const { [id]: _killed, ...rest } = updated;
      updated = rest;
    } else {
      updated[id] = damaged;
    }
  }

  return { zombies: updated, scoreDelta, killedCount };
}

function freezeAllZombies(
  zombies: Record<string, RuntimeZombie>,
  gameTimeMs: number
): Record<string, RuntimeZombie> {
  const updated: Record<string, RuntimeZombie> = {};
  for (const [id, zombie] of Object.entries(zombies)) {
    updated[id] = {
      ...zombie,
      isEating: false,
      eatTargetId: null,
      isFrozen: true,
      statusEffects: [
        ...zombie.statusEffects.filter((effect) => effect.type !== "FROZEN"),
        { type: "FROZEN", expiresAtMs: gameTimeMs + 4000 },
      ],
    };
  }
  return updated;
}

function cloneGrid(grid: GameEngineState["grid"]): GameEngineState["grid"] {
  return grid.map((r) => r.map((c) => ({ ...c })));
}

function isNightStyleMushroomEnvironment(env: EnvironmentConfig): boolean {
  return env.type === "NIGHT" || env.type === "FOG";
}

function shouldMushroomSleep(
  def: { isMushroomType: boolean },
  env: EnvironmentConfig
): boolean {
  return def.isMushroomType && !isNightStyleMushroomEnvironment(env);
}

function applyInstantPlantEffect(
  plantType: string,
  row: number,
  col: number,
  state: Pick<
    GameEngineState,
    "environment" | "gameTimeMs" | "grid" | "zombies" | "score" | "totalZombiesKilled"
  >
): {
  zombies: Record<string, RuntimeZombie>;
  score: number;
  totalZombiesKilled: number;
  grid: GameEngineState["grid"] | null;
} {
  const def = getPlantDef(plantType);
  let zombies = state.zombies;
  let score = state.score;
  let totalZombiesKilled = state.totalZombiesKilled;
  let grid: GameEngineState["grid"] | null = null;

  if (plantType === "CHERRY_BOMB") {
    const result = damageZombiesInArea(
      zombies,
      (zombie) => Math.abs(zombie.lane - row) <= 1 && Math.abs(zombie.x - col) <= 1.5,
      def.attackDamage ?? 1800
    );
    zombies = result.zombies;
    score += result.scoreDelta;
    totalZombiesKilled += result.killedCount;
  } else if (plantType === "JALAPENO") {
    const result = damageZombiesInArea(
      zombies,
      (zombie) => zombie.lane === row,
      def.attackDamage ?? 1800
    );
    zombies = result.zombies;
    score += result.scoreDelta;
    totalZombiesKilled += result.killedCount;
  } else if (plantType === "ICE_SHROOM") {
    zombies = freezeAllZombies(zombies, state.gameTimeMs);
  } else if (plantType === "DOOM_SHROOM") {
    const result = damageZombiesInArea(
      zombies,
      (zombie) =>
        Math.abs(zombie.lane - row) <= DOOM_SHROOM_RADIUS_LANES &&
        Math.abs(zombie.x - col) <= DOOM_SHROOM_RADIUS_COLS,
      def.attackDamage ?? 1800
    );
    zombies = result.zombies;
    score += result.scoreDelta;
    totalZombiesKilled += result.killedCount;

    grid = cloneGrid(state.grid);
    const craterCell = grid[row]?.[col];
    if (craterCell) {
      craterCell.craterExpiresAtMs = state.gameTimeMs + DOOM_SHROOM_CRATER_MS;
    }
  } else if (plantType === "BLOVER") {
    const remaining: Record<string, RuntimeZombie> = {};
    for (const [id, zombie] of Object.entries(zombies)) {
      if (zombie.isAerial) {
        score += scoreKilledZombie(zombie);
        totalZombiesKilled += 1;
      } else {
        remaining[id] = zombie;
      }
    }
    zombies = remaining;
    if (state.environment.fogEnabled) {
      grid = cloneGrid(state.grid);
      clearAllFog(grid);
    }
  }

  return { zombies, score, totalZombiesKilled, grid };
}

// ---------------------------------------------------------------------------

const EMPTY_ENV: EnvironmentConfig = {
  type: "DAY",
  gridRows: 5,
  gridCols: 9,
  waterLaneIndices: [],
  gravesEnabled: false,
  fogEnabled: false,
  slopeEnabled: false,
  conveyorBelt: false,
  skyDropSun: true,
};

const INITIAL_STATE: GameEngineState = {
  status: "idle",
  environment: EMPTY_ENV,
  grid: [],
  plants: {},
  zombies: {},
  projectiles: {},
  sunDrops: {},
  lawnMowers: {},
  currentSun: 50,
  cumulativeSun: 0,
  gameTimeMs: 0,
  waveNumber: 0,
  nextWaveAtMs: WAVE_INTERVAL_MS,
  rngState: DEFAULT_RNG_SEED,
  score: 0,
  totalZombiesKilled: 0,
  loadout: [],
  selectedSlot: null,
  nextSkyDropAtMs: SKY_SUN_INTERVAL_MS,
  zombieSpawnQueue: [],
};

interface GameActions {
  initGame: (env: EnvironmentConfig, loadout: SeedPacketSlot[]) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  placePlant: (plantType: string, row: number, col: number) => boolean;
  removePlant: (instanceId: string) => void;
  collectSunDrop: (dropId: string) => void;
  selectSlot: (slot: number | null) => void;
  queueZombie: (zombieType: string, lane: number, spawnAtMs: number) => void;
  tick: (deltaMs: number) => void;
  reset: () => void;
}

export type GameStore = GameEngineState & GameActions;

export const useGameStore = create<GameStore>()((set, get) => ({
  ...INITIAL_STATE,

  initGame: (env, loadout) => {
    _plantCounter = 0;
    _zombieCounter = 0;
    _sunDropCounter = 0;
    resetPlantAiCounters();
    set({
      ...INITIAL_STATE,
      status: "idle",
      environment: env,
      grid: generateGrid(env),
      lawnMowers: createLawnMowers(env),
      currentSun: getInitialSun(env),
      loadout,
      nextSkyDropAtMs: SKY_SUN_INTERVAL_MS,
      nextWaveAtMs: WAVE_INTERVAL_MS,
      rngState: createInitialRngState([
        env,
        loadout.map((slot) => slot.plantType),
      ]),
    });
  },

  startGame: () => {
    const { status } = get();
    if (status === "idle" || status === "paused") set({ status: "playing" });
  },

  pauseGame: () => set({ status: "paused" }),

  resumeGame: () => {
    if (get().status === "paused") set({ status: "playing" });
  },

  placePlant: (plantType, row, col) => {
    const state = get();
    if (state.status !== "playing") return false;

    let def;
    try { def = getPlantDef(plantType); } catch { return false; }

    const cell = getCell(state.grid, row, col);
    if (!cell) return false;

    const loadoutIndex = state.loadout.findIndex((slot) => slot.plantType === plantType);
    const loadoutSlot = loadoutIndex >= 0 ? state.loadout[loadoutIndex] : null;
    if (loadoutSlot && loadoutSlot.cooldownRemainingMs > 0) return false;

    let loadout = state.loadout;
    const rechargeSeed = () => {
      if (!loadoutSlot) return loadout;
      return state.loadout.map((slot, index) =>
        index === loadoutIndex
          ? { ...slot, cooldownRemainingMs: slot.cooldownTotalMs }
          : slot
      );
    };

    if (plantType === "COFFEE_BEAN") {
      const target = Object.values(state.plants).find((plant) => {
        if (plant.row !== row || plant.col !== col || !plant.isSleeping) return false;
        try {
          return getPlantDef(plant.plantType).isMushroomType;
        } catch {
          return false;
        }
      });
      if (!target) return false;

      const newSun = spendSun(state.currentSun, def.sunCost);
      if (newSun === null) return false;

      const targetDef = getPlantDef(target.plantType);
      if (targetDef.isInstantUse) {
        const gridWithoutInstantPlant = cloneGrid(state.grid);
        setPlantInCorrectSlot(
          gridWithoutInstantPlant,
          target.row,
          target.col,
          target.plantType,
          null
        );

        const { [target.instanceId]: _spentInstantPlant, ...remainingPlants } = state.plants;
        const instantResult = applyInstantPlantEffect(target.plantType, target.row, target.col, {
          environment: state.environment,
          gameTimeMs: state.gameTimeMs,
          grid: gridWithoutInstantPlant,
          zombies: state.zombies,
          score: state.score,
          totalZombiesKilled: state.totalZombiesKilled,
        });

        set({
          plants: remainingPlants,
          grid: instantResult.grid ?? gridWithoutInstantPlant,
          zombies: instantResult.zombies,
          score: instantResult.score,
          totalZombiesKilled: instantResult.totalZombiesKilled,
          currentSun: newSun,
          loadout: rechargeSeed(),
          selectedSlot: null,
        });
        return true;
      }

      set({
        plants: {
          ...state.plants,
          [target.instanceId]: { ...target, isSleeping: false },
        },
        currentSun: newSun,
        loadout: rechargeSeed(),
        selectedSlot: null,
      });
      return true;
    }

    const newSun = spendSun(state.currentSun, def.sunCost);
    if (newSun === null) return false;

    if (!canPlantHere(state.grid, row, col, {
      isAquatic: def.isAquatic,
      requiresLilyPad: cell.isWater && !def.isAquatic,
      requiresFlowerPot: cell.isSlope && !isFlowerPotPlant(plantType),
      isLilyPad: isLilyPadPlant(plantType),
      isFlowerPot: isFlowerPotPlant(plantType),
      isPumpkin: isPumpkinPlant(plantType),
    })) return false;

    loadout = rechargeSeed();

    if (def.isInstantUse && shouldMushroomSleep(def, state.environment)) {
      const instanceId = nextPlantId(plantType, row, col);
      const plant: RuntimePlant = {
        instanceId,
        plantType,
        row,
        col,
        health: def.health,
        maxHealth: def.health,
        lastAttackAtMs: 0,
        lastSunAtMs: state.gameTimeMs,
        isSleeping: true,
        isCharging: false,
        chargeEndsAtMs: 0,
        armedAtMs: null,
      };
      const newGrid = cloneGrid(state.grid);
      setPlantInCorrectSlot(newGrid, row, col, plantType, instanceId);

      set({
        plants: { ...state.plants, [instanceId]: plant },
        currentSun: newSun,
        grid: newGrid,
        loadout,
        selectedSlot: null,
      });
      return true;
    }

    if (def.isInstantUse) {
      const instantResult = applyInstantPlantEffect(plantType, row, col, {
        environment: state.environment,
        gameTimeMs: state.gameTimeMs,
        grid: state.grid,
        zombies: state.zombies,
        score: state.score,
        totalZombiesKilled: state.totalZombiesKilled,
      });

      set({
        currentSun: newSun,
        loadout,
        selectedSlot: null,
        zombies: instantResult.zombies,
        score: instantResult.score,
        totalZombiesKilled: instantResult.totalZombiesKilled,
        ...(instantResult.grid ? { grid: instantResult.grid } : {}),
      });
      return true;
    }

    const instanceId = nextPlantId(plantType, row, col);
    const initialSunClock =
      def.produceSun && def.sunProduceIntervalMs !== null
        ? state.gameTimeMs - Math.max(0, def.sunProduceIntervalMs - SUN_PRODUCER_INITIAL_DELAY_MS)
        : state.gameTimeMs;

    const plant: RuntimePlant = {
      instanceId, plantType, row, col,
      health: def.health, maxHealth: def.health,
      lastAttackAtMs: 0,
      lastSunAtMs: initialSunClock,
      isSleeping: shouldMushroomSleep(def, state.environment),
      isCharging: plantType === "POTATO_MINE",
      chargeEndsAtMs: plantType === "POTATO_MINE" ? state.gameTimeMs + POTATO_MINE_ARM_MS : 0,
      armedAtMs: null,
    };

    // Deep-clone the grid rows we need to mutate
    const newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
    setPlantInCorrectSlot(newGrid, row, col, plantType, instanceId);
    if (plantType === "PLANTERN") {
      clearFogAround(newGrid, row, col);
    }

    set({
      plants: { ...state.plants, [instanceId]: plant },
      currentSun: newSun,
      grid: newGrid,
      loadout,
      selectedSlot: null,
    });
    return true;
  },

  removePlant: (instanceId) => {
    const state = get();
    const plant = state.plants[instanceId];
    if (!plant) return;

    const newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
    setPlantInCorrectSlot(newGrid, plant.row, plant.col, plant.plantType, null);

    const { [instanceId]: _removed, ...rest } = state.plants;
    set({ plants: rest, grid: newGrid });
  },

  collectSunDrop: (dropId) => {
    const state = get();
    const drop = state.sunDrops[dropId];
    if (!drop || drop.state === "collected") return;

    const { [dropId]: _removed, ...rest } = state.sunDrops;
    set({
      currentSun: collectSun(state.currentSun, drop.value),
      cumulativeSun: state.cumulativeSun + drop.value,
      sunDrops: rest,
    });
  },

  selectSlot: (slot) => set({ selectedSlot: slot }),

  queueZombie: (zombieType, lane, spawnAtMs) => {
    const state = get();
    set({
      zombieSpawnQueue: [
        ...state.zombieSpawnQueue,
        { zombieType, lane, spawnAtMs },
      ],
    });
  },

  tick: (deltaMs) => {
    const state = get();

    // 1. Guard: return if not playing
    if (state.status !== "playing") return;

    // 2. Advance game time
    const newGameTimeMs = state.gameTimeMs + deltaMs;
    const env = state.environment;

    // -----------------------------------------------------------------------
    // 3. Wave progression
    // -----------------------------------------------------------------------
    let waveNumber = state.waveNumber;
    let nextWaveAtMs = state.nextWaveAtMs;
    let rngState = state.rngState;
    let zombieSpawnQueue = [...state.zombieSpawnQueue];

    if (newGameTimeMs >= nextWaveAtMs) {
      const newWaveNumber = waveNumber + 1;
      const entries = generateWave(newWaveNumber, env.gridRows);
      const newEntries = entries.map((entry) => ({
        zombieType: entry.zombieType,
        lane: entry.lane,
        spawnAtMs: newGameTimeMs + entry.spawnAtMs,
      }));
      zombieSpawnQueue = [...zombieSpawnQueue, ...newEntries];
      if (env.gravesEnabled && newWaveNumber % 5 === 0) {
        const graveAmbushes = state.grid
          .flat()
          .filter((cell) => cell.graveId !== null)
          .map((cell, index) => ({
            zombieType: "NORMAL",
            lane: cell.row,
            x: cell.col,
            spawnAtMs: newGameTimeMs + index * 500,
          }));
        zombieSpawnQueue = [...zombieSpawnQueue, ...graveAmbushes];
      }
      waveNumber = newWaveNumber;
      nextWaveAtMs = nextWaveAtMs + WAVE_INTERVAL_MS;
    }

    // -----------------------------------------------------------------------
    // 4. Spawn zombies from queue
    // -----------------------------------------------------------------------
    const toSpawn = zombieSpawnQueue.filter((e) => e.spawnAtMs <= newGameTimeMs);
    const remainingQueue = zombieSpawnQueue.filter((e) => e.spawnAtMs > newGameTimeMs);

    let zombies: Record<string, RuntimeZombie> = { ...state.zombies };
    for (const entry of toSpawn) {
      const def = getZombieDef(entry.zombieType);
      const id = nextZombieId(entry.zombieType);
      const lane = resolveAquaticSpawnLane(entry.zombieType, entry.lane, env);
      zombies[id] = {
        instanceId: id,
        zombieType: entry.zombieType,
        lane,
        x: entry.x ?? ZOMBIE_SPAWN_X,
        health: def.health, maxHealth: def.health,
        armorHealth: def.armorHealth,
        speedColsPerSec: def.speedColsPerSec,
        eatDamagePerSec: def.eatDamagePerSec,
        isEating: false, eatTargetId: null,
        statusEffects: [],
        isUnderground: def.isUnderground,
        isAerial: def.isAerial,
        isFrozen: false,
        isSubmerged: entry.zombieType === "SNORKEL" && isWaterLane(env, lane),
        hasJumped: entry.zombieType === "DOLPHIN_RIDER" ? false : undefined,
        direction: "left",
        pogoStickActive: entry.zombieType === "POGO" ? true : undefined,
      };
    }

    let score = state.score;
    let totalZombiesKilled = state.totalZombiesKilled;
    let lawnMowers = advanceLawnMowers(state.lawnMowers, deltaMs, env.gridCols);
    const activeMowerHits = clearActiveLawnMowerHits(zombies, lawnMowers);
    zombies = activeMowerHits.zombies;
    score += activeMowerHits.scoreDelta;
    totalZombiesKilled += activeMowerHits.killedCount;

    // -----------------------------------------------------------------------
    // 5. Tick sun drops: advance falling drops, remove expired ones
    // -----------------------------------------------------------------------
    let sunDrops: typeof state.sunDrops = {};
    for (const [id, drop] of Object.entries(state.sunDrops)) {
      const advanced = advanceSunDrop(drop, deltaMs, SKY_SUN_FALL_SPEED_PER_MS);
      if (!isSunDropExpired(advanced, newGameTimeMs)) {
        sunDrops[id] = advanced;
      }
    }

    // -----------------------------------------------------------------------
    // 6. Sky sun
    // -----------------------------------------------------------------------
    let nextSkyDropAtMs = state.nextSkyDropAtMs;
    const skyResult = tickSkySun(newGameTimeMs, nextSkyDropAtMs, env);
    if (skyResult.shouldDrop) {
      const id = nextSunId();
      const col = Math.floor(Math.random() * env.gridCols);
      const targetRow = 1 + Math.floor(Math.random() * 3);
      const drop = createSkySunDrop(newGameTimeMs, id, col, targetRow);
      sunDrops = { ...sunDrops, [id]: drop };
      nextSkyDropAtMs = skyResult.nextSkyDropAtMs;
    }

    // -----------------------------------------------------------------------
    // 7. Plant AI loop
    // -----------------------------------------------------------------------
    let plants = { ...state.plants };
    let projectiles = { ...state.projectiles };
    const nextPlantRandom = () => {
      const result = nextRandomValue(rngState);
      rngState = result.rngState;
      return result.value;
    };
    const loadout = state.loadout.map((slot) => ({
      ...slot,
      cooldownRemainingMs: Math.max(0, slot.cooldownRemainingMs - deltaMs),
    }));

    for (const [plantId, plant] of Object.entries(plants)) {
      let currentPlant = plant;
      let def;
      try { def = getPlantDef(currentPlant.plantType); } catch { continue; }

      if (
        currentPlant.plantType === "POTATO_MINE" &&
        currentPlant.isCharging &&
        newGameTimeMs >= currentPlant.chargeEndsAtMs
      ) {
        currentPlant = {
          ...currentPlant,
          isCharging: false,
          armedAtMs: currentPlant.chargeEndsAtMs,
        };
      }

      if (
        currentPlant.plantType === "CHOMPER" &&
        currentPlant.isCharging &&
        newGameTimeMs >= currentPlant.chargeEndsAtMs
      ) {
        currentPlant = {
          ...currentPlant,
          isCharging: false,
          chargeEndsAtMs: 0,
        };
      }

      // 7b. Sun production
      const sunResult = plantProduceSun(currentPlant, def, newGameTimeMs);
      if (sunResult.sunDrop) {
        sunDrops = { ...sunDrops, [sunResult.sunDrop.instanceId]: sunResult.sunDrop };
        currentPlant = sunResult.updatedPlant;
      }

      // 7c. Attack
      if (shouldPlantAttack(currentPlant, def, newGameTimeMs, zombies, env.gridRows)) {
        const fireResult = plantFire(
          currentPlant,
          def,
          newGameTimeMs,
          zombies,
          env.gridRows,
          nextPlantRandom
        );
        if (fireResult.projectiles.length > 0) {
          projectiles = {
            ...projectiles,
            ...Object.fromEntries(
              fireResult.projectiles.map((projectile) => [projectile.instanceId, projectile])
            ),
          };
          currentPlant = fireResult.updatedPlant;
        }
      }

      plants[plantId] = currentPlant;
    }

    // -----------------------------------------------------------------------
    // 7d. Contact-trigger plants and melee plants
    // -----------------------------------------------------------------------
    let gridChanged = false;
    let newGrid = state.grid;

    for (const gridRow of state.grid) {
      for (const cell of gridRow) {
        if (cell.craterExpiresAtMs === null || cell.craterExpiresAtMs > newGameTimeMs) continue;
        if (!gridChanged) {
          newGrid = cloneGrid(state.grid);
          gridChanged = true;
        }
        const craterCell = newGrid[cell.row]?.[cell.col];
        if (craterCell) craterCell.craterExpiresAtMs = null;
      }
    }

    for (const [plantId, plant] of Object.entries(plants)) {
      if (plant.plantType === "CHOMPER") {
        if (plant.isCharging) continue;
        const trigger = Object.entries(zombies).find(([, zombie]) => {
          if (zombie.isUnderground || zombie.isAerial) return false;
          if (zombie.lane !== plant.row) return false;
          return zombie.x >= plant.col - 0.2 && zombie.x <= plant.col + 1.5;
        });
        if (!trigger) continue;

        const [zombieId, zombie] = trigger;
        const def = getPlantDef("CHOMPER");
        score += scoreKilledZombie(zombie);
        totalZombiesKilled += 1;
        const { [zombieId]: _eatenZombie, ...remainingZombies } = zombies;
        zombies = remainingZombies;
        plants[plantId] = {
          ...plant,
          isCharging: true,
          chargeEndsAtMs: newGameTimeMs + (def.attackCooldownMs ?? 42_000),
        };
        continue;
      }

      if (plant.plantType === "SPIKEWEED") {
        const def = getPlantDef("SPIKEWEED");
        if (def.attackCooldownMs === null || newGameTimeMs - plant.lastAttackAtMs < def.attackCooldownMs) {
          continue;
        }
        const hasTarget = Object.values(zombies).some((zombie) =>
          zombie.lane === plant.row &&
          !zombie.isUnderground &&
          !zombie.isAerial &&
          zombie.x >= plant.col - 0.45 &&
          zombie.x <= plant.col + 0.45
        );
        if (!hasTarget) continue;

        const result = damageZombiesInArea(
          zombies,
          (zombie) =>
            zombie.lane === plant.row &&
            !zombie.isAerial &&
            zombie.x >= plant.col - 0.45 &&
            zombie.x <= plant.col + 0.45,
          def.attackDamage ?? 20
        );
        zombies = result.zombies;
        score += result.scoreDelta;
        totalZombiesKilled += result.killedCount;
        plants[plantId] = { ...plant, lastAttackAtMs: newGameTimeMs };
        continue;
      }

      if (
        plant.plantType !== "POTATO_MINE" &&
        plant.plantType !== "TANGLE_KELP" &&
        plant.plantType !== "SQUASH"
      ) {
        continue;
      }
      if (plant.plantType === "POTATO_MINE" && plant.isCharging) continue;

      const trigger = Object.entries(zombies).find(([, zombie]) => {
        if (zombie.isUnderground || zombie.isAerial) return false;
        if (zombie.lane !== plant.row) return false;
        if (plant.plantType === "SQUASH") {
          return zombie.x >= plant.col - 1 && zombie.x <= plant.col + 1.5;
        }
        return zombie.x >= plant.col - 0.35 && zombie.x <= plant.col + 0.65;
      });
      if (!trigger) continue;

      const [zombieId, zombie] = trigger;
      score += scoreKilledZombie(zombie);
      totalZombiesKilled += 1;
      const { [zombieId]: _killedZombie, ...remainingZombies } = zombies;
      zombies = remainingZombies;

      if (!gridChanged) {
        newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
        gridChanged = true;
      }
      setPlantInCorrectSlot(newGrid, plant.row, plant.col, plant.plantType, null);
      const { [plantId]: _spentPlant, ...remainingPlants } = plants;
      plants = remainingPlants;
    }

    // -----------------------------------------------------------------------
    // 8. Zombie AI loop
    // -----------------------------------------------------------------------
    // We may need to update the grid if a plant dies from eating

    for (const [zombieId, zombie] of Object.entries(zombies)) {
      // 8a. Tick status effects
      let z = tickStatusEffects(zombie, newGameTimeMs);
      if (shouldDiggerEmerge(z)) {
        z = emergeDigger(z, newGameTimeMs);
      }
      if (z.isEating && z.zombieType === "SNORKEL" && z.isSubmerged) {
        z = { ...z, isSubmerged: false };
      }

      // 8b. If eating, check if target plant still exists and is alive
      if (z.isEating && z.eatTargetId) {
        const targetId = z.eatTargetId;
        const targetPlant = plants[targetId];
        if (targetPlant && !isPlantDead(targetPlant)) {
          // Apply eating damage to the plant
          const damagedPlant = applyEatingDamage(targetPlant, z, deltaMs);
          plants[targetId] = damagedPlant;

          if (targetPlant.plantType === "GARLIC") {
            z = stopEating({
              ...z,
              lane: chooseGarlicDiversionLane(z, env.gridRows),
            });
          }

          // If plant just died from eating damage, remove it
          if (isPlantDead(damagedPlant)) {
            if (!gridChanged) {
              newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
              gridChanged = true;
            }
            setPlantInCorrectSlot(newGrid, damagedPlant.row, damagedPlant.col, damagedPlant.plantType, null);
            const { [targetId]: _dead, ...remainingPlants } = plants;
            plants = remainingPlants;
            z = stopEating(z);
          }
        } else {
          // Plant no longer exists or is dead — stop eating
          if (targetPlant && isPlantDead(targetPlant)) {
            if (!gridChanged) {
              newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
              gridChanged = true;
            }
            setPlantInCorrectSlot(newGrid, targetPlant.row, targetPlant.col, targetPlant.plantType, null);
            const { [targetId]: _dead, ...remainingPlants } = plants;
            plants = remainingPlants;
          }
          z = stopEating(z);
        }
      }

      // 8c. If not eating, check if zombie should start eating a plant
      if (!z.isEating && !isZombieImmobilized(z) && !isDiggerEmerging(z, newGameTimeMs)) {
        if (shouldSnorkelSubmerge(z, env) && !z.isSubmerged) {
          z = { ...z, isSubmerged: true };
        }
        const foundEatTarget = chooseZombieEatTarget(z, plants);
        if (foundEatTarget) {
          if (canDolphinJumpTarget(z, foundEatTarget, env, plants)) {
            z = jumpDolphinOverPlant(z, foundEatTarget);
          } else if (canPogoJumpTarget(z, foundEatTarget, plants)) {
            z = jumpPogoOverPlant(z, foundEatTarget);
          } else {
            const shouldRemovePogoStick = isPogoStickActive(z) && hasTallNutInCell(foundEatTarget, plants);
            const eater = shouldRemovePogoStick ? removePogoStick(z) : z;
            z = startEating(
              eater.zombieType === "SNORKEL" ? { ...eater, isSubmerged: false } : eater,
              foundEatTarget.instanceId
            );
          }
        }
      }

      // 8d. If not eating and not frozen, move the zombie
      if (!z.isEating && !z.isFrozen && !isDiggerEmerging(z, newGameTimeMs)) {
        z = moveZombie(z, deltaMs);
        if (shouldDiggerEmerge(z)) {
          z = emergeDigger(z, newGameTimeMs);
        }
      }

      if (hasDiggerExitedLawn(z, env)) {
        const { [zombieId]: _escapedDigger, ...remainingZombies } = zombies;
        zombies = remainingZombies;
        continue;
      }

      zombies[zombieId] = z;
    }

    // 8e. Check house breach: consume lane mower first, lose only after it is gone.
    const breachedLanes = new Set(
      Object.values(zombies)
        .filter((zombie) => !zombie.isUnderground && zombie.x <= LAWN_MOWER_TRIGGER_X)
        .map((zombie) => zombie.lane)
    );

    for (const lane of breachedLanes) {
      const mowerKey = lawnMowerId(lane);
      const mower = lawnMowers[mowerKey];
      if (mower?.state === "ready") {
        lawnMowers = {
          ...lawnMowers,
          [mowerKey]: {
            ...mower,
            state: "active",
            x: LAWN_MOWER_TRIGGER_X,
            triggeredAtMs: newGameTimeMs,
          },
        };
        const laneClear = clearZombiesByPredicate(
          zombies,
          (zombie) => zombie.lane === lane
        );
        zombies = laneClear.zombies;
        score += laneClear.scoreDelta;
        totalZombiesKilled += laneClear.killedCount;
      } else {
        set({ status: "game-over" });
        return;
      }
    }

    // -----------------------------------------------------------------------
    // 9. Projectile AI loop
    // -----------------------------------------------------------------------
    const updatedProjectiles: typeof projectiles = {};

    for (const [projId, proj] of Object.entries(projectiles)) {
      // 9a. Advance
      const advanced = transformProjectileWithTorchwood(
        advanceProjectile(proj, deltaMs),
        plants,
        proj.x
      );

      // 9b. Find hits
      const hitIds = advanced.trajectory === "straight"
        ? findStraightHits(advanced, zombies)
        : findLobbedHits(advanced, zombies);

      // 9c. Apply hits
      const hitResult = applyProjectileHits(advanced, zombies, hitIds, newGameTimeMs);

      // 9d. Score killed zombies
      for (const killedId of hitResult.killedZombieIds) {
        const killedZombie = hitResult.updatedZombies[killedId] ?? zombies[killedId];
        if (killedZombie) {
          score += scoreKilledZombie(killedZombie);
          totalZombiesKilled += 1;
        }
      }

      // 9e. Remove dead zombies
      zombies = hitResult.updatedZombies;
      for (const killedId of hitResult.killedZombieIds) {
        const { [killedId]: _killed, ...rest } = zombies;
        zombies = rest;
      }

      // 9f. Keep or discard projectile
      const shouldRemove = shouldRemoveProjectile(advanced, env.gridCols, env.gridRows) || hitResult.removeProjectile;
      if (!shouldRemove) {
        updatedProjectiles[projId] = advanced;
      }
    }
    projectiles = updatedProjectiles;

    // -----------------------------------------------------------------------
    // 10. Remove dead plants (health <= 0) — any remaining after eating loop
    // -----------------------------------------------------------------------
    for (const [plantId, plant] of Object.entries(plants)) {
      if (isPlantDead(plant)) {
        if (!gridChanged) {
          newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
          gridChanged = true;
        }
        setPlantInCorrectSlot(newGrid, plant.row, plant.col, plant.plantType, null);
        const { [plantId]: _dead, ...remainingPlants } = plants;
        plants = remainingPlants;
      }
    }

    // -----------------------------------------------------------------------
    // 11. Check victory
    // -----------------------------------------------------------------------
    const zombieCount = Object.keys(zombies).length;
    if (waveNumber > 5 && zombieCount === 0 && remainingQueue.length === 0) {
      set({
        status: "victory",
        gameTimeMs: newGameTimeMs,
        waveNumber,
        nextWaveAtMs,
        zombieSpawnQueue: remainingQueue,
        sunDrops,
        nextSkyDropAtMs,
        plants,
        zombies,
        lawnMowers,
        projectiles,
        loadout,
        rngState,
        score,
        totalZombiesKilled,
        ...(gridChanged ? { grid: newGrid } : {}),
      });
      return;
    }

    // -----------------------------------------------------------------------
    // 12. Batch set all updated state
    // -----------------------------------------------------------------------
    set({
      gameTimeMs: newGameTimeMs,
      waveNumber,
      nextWaveAtMs,
      zombieSpawnQueue: remainingQueue,
      sunDrops,
      nextSkyDropAtMs,
      plants,
      zombies,
      lawnMowers,
      projectiles,
      loadout,
      rngState,
      score,
      totalZombiesKilled,
      ...(gridChanged ? { grid: newGrid } : {}),
    });
  },

  reset: () => {
    _plantCounter = 0;
    _zombieCounter = 0;
    _sunDropCounter = 0;
    resetPlantAiCounters();
    set({ ...INITIAL_STATE, grid: [], rngState: DEFAULT_RNG_SEED });
  },
}));
