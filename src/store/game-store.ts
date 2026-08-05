import { create } from "zustand";
import type {
  GameEngineState,
  EnvironmentConfig,
  LevelRuntimeRules,
  PlacementFailureReason,
  RuntimeBowlingNut,
  RuntimeLawnMower,
  RuntimePlant,
  RuntimeSunDrop,
  RuntimeZombie,
  SeedPacketSlot,
  WaveAnnouncementKind,
} from "../engine/types";
import {
  generateGrid,
  getCell,
  canPlantHere,
  getPlacementFailureReason,
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
  POLE_VAULT_POST_JUMP_SPEED_COLS_PER_SEC,
  BOWLING_NUT_SPEED_COLS_PER_SEC,
  BOWLING_NUT_DAMAGE,
  BOWLING_EXPLODE_DAMAGE,
  CONVEYOR_DEFAULT_INTERVAL_MS,
  HUGE_WAVE_BANNER_MS,
  GARGANTUAR_IMP_LANDING_MAX_X,
  GARGANTUAR_IMP_LANDING_MIN_X,
  GARGANTUAR_IMP_THROW_HEALTH_THRESHOLD,
  GARGANTUAR_IMP_THROW_MIN_X,
  GARGANTUAR_SMASH_RECOVERY_MS,
  GRAVE_BUSTER_DURATION_MS,
  ICE_SHROOM_CHILL_MS,
  ICE_SHROOM_FREEZE_MS,
  LAWN_MOWER_READY_X,
  LAWN_MOWER_SPEED_COLS_PER_SEC,
  LAWN_MOWER_TRIGGER_X,
  BUNGEE_GRAB_DELAY_MS,
  CATAPULT_BASKETBALL_DAMAGE,
  CATAPULT_FIRE_INTERVAL_MS,
  CATAPULT_FIRE_RANGE_COLS,
  DANCING_ZOMBIE_CALL_X,
  JACK_IN_THE_BOX_MIN_EXPLODE_MS,
  JACK_IN_THE_BOX_MAX_EXPLODE_MS,
  MAGNET_SHROOM_RANGE_COLS,
  MAGNET_SHROOM_RANGE_LANES,
  MAGNETIC_ZOMBIE_TYPES,
  MARIGOLD_COIN_INTERVAL_MS,
  MARIGOLD_GOLD_CHANCE,
  MARIGOLD_GOLD_COIN_SCORE,
  MARIGOLD_SILVER_COIN_SCORE,
  NEWSPAPER_ENRAGED_SPEED_COLS_PER_SEC,
  POGO_WITHOUT_STICK_SPEED_COLS_PER_SEC,
  UMBRELLA_LEAF_RADIUS_COLS,
  UMBRELLA_LEAF_RADIUS_LANES,
  POTATO_MINE_ARM_MS,
  SKY_SUN_INTERVAL_MS,
  SKY_SUN_FALL_SPEED_PER_MS,
  SUN_PRODUCER_INITIAL_DELAY_MS,
  FIRST_WAVE_AT_MS,
  WAVE_ADVANCE_MAX_REMAINING,
  WAVE_FLAG_ADVANCE_MAX_REMAINING,
  WAVE_INTERVAL_MS,
  WAVE_REST_AFTER_SPAWN_MS,
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
import { generateWave, getFinalWaveNumber, parseWaveConfig } from "../engine/wave-generator";
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
    if (plant.plantType === "SPIKEWEED" && zombie.zombieType !== "GARGANTUAR") continue;
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

function createRuntimeZombie(
  zombieType: string,
  lane: number,
  x: number,
  env: EnvironmentConfig,
  gameTimeMs: number,
  random: () => number
): RuntimeZombie {
  const def = getZombieDef(zombieType);
  return {
    instanceId: nextZombieId(zombieType),
    zombieType,
    lane,
    x,
    health: def.health,
    maxHealth: def.health,
    armorHealth: def.armorHealth,
    speedColsPerSec: def.speedColsPerSec,
    eatDamagePerSec: def.eatDamagePerSec,
    isEating: false,
    eatTargetId: null,
    statusEffects: [],
    isUnderground: def.isUnderground,
    isAerial: def.isAerial,
    isFrozen: false,
    isSubmerged: zombieType === "SNORKEL" && isWaterLane(env, lane),
    hasJumped:
      zombieType === "DOLPHIN_RIDER" || zombieType === "POLE_VAULT" ? false : undefined,
    direction: "left",
    pogoStickActive: zombieType === "POGO" ? true : undefined,
    hasThrownImp: zombieType === "GARGANTUAR" ? false : undefined,
    bungeeGrabAtMs: zombieType === "BUNGEE" ? gameTimeMs + BUNGEE_GRAB_DELAY_MS : undefined,
    catapultLastFireAtMs: zombieType === "CATAPULT" ? gameTimeMs : undefined,
    isEnraged: zombieType === "NEWSPAPER" ? false : undefined,
    hasCalledDancers: zombieType === "DANCING" ? false : undefined,
    jackboxExplodeAtMs:
      zombieType === "JACK_IN_THE_BOX"
        ? gameTimeMs + JACK_IN_THE_BOX_MIN_EXPLODE_MS + random() * (JACK_IN_THE_BOX_MAX_EXPLODE_MS - JACK_IN_THE_BOX_MIN_EXPLODE_MS)
        : undefined,
  };
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

function canPoleVaultJumpTarget(
  zombie: RuntimeZombie,
  plant: RuntimePlant,
  plants: Record<string, RuntimePlant>
): boolean {
  return (
    zombie.zombieType === "POLE_VAULT" &&
    zombie.hasJumped !== true &&
    !hasTallNutInCell(plant, plants)
  );
}

function jumpPoleVaultOverPlant(zombie: RuntimeZombie, plant: RuntimePlant): RuntimeZombie {
  return {
    ...zombie,
    x: Math.min(zombie.x, plant.col - 0.65),
    hasJumped: true,
    speedColsPerSec: POLE_VAULT_POST_JUMP_SPEED_COLS_PER_SEC,
    isEating: false,
    eatTargetId: null,
  };
}

function isPogoStickActive(zombie: RuntimeZombie): boolean {
  return zombie.zombieType === "POGO" && zombie.pogoStickActive !== false;
}

const DEFAULT_LEVEL_RULES: LevelRuntimeRules = {
  playMode: "NORMAL",
  freePlacement: false,
  hideSunHud: false,
  conveyorBelt: false,
  conveyorPlantPool: [],
  conveyorIntervalMs: CONVEYOR_DEFAULT_INTERVAL_MS,
  conveyorSlotCap: 10,
  bowlingNutTypes: ["WALL_NUT"],
};

let _bowlingCounter = 0;
function nextBowlingId(): string {
  _bowlingCounter += 1;
  return `bowl-${_bowlingCounter}`;
}

function makeConveyorSlot(plantType: string, slotIndex: number): SeedPacketSlot {
  let def;
  try {
    def = getPlantDef(plantType);
  } catch {
    def = getPlantDef("PEASHOOTER");
  }
  return {
    plantType,
    plantId: plantType.toLowerCase().replace(/_/g, "-"),
    sunCost: 0,
    cooldownRemainingMs: 0,
    cooldownTotalMs: 0,
    isSelected: false,
    slotIndex,
  };
}

function createBowlingNut(nutType: string, lane: number): RuntimeBowlingNut {
  const isExplosive = nutType === "EXPLODE_O_NUT";
  return {
    instanceId: nextBowlingId(),
    nutType,
    lane,
    x: -0.2,
    speedColsPerSec: BOWLING_NUT_SPEED_COLS_PER_SEC,
    damage: isExplosive ? BOWLING_EXPLODE_DAMAGE : BOWLING_NUT_DAMAGE,
    isExplosive,
    hitZombieIds: [],
  };
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

function isGargantuarSmashing(zombie: RuntimeZombie, gameTimeMs: number): boolean {
  return (
    zombie.zombieType === "GARGANTUAR" &&
    typeof zombie.smashUntilMs === "number" &&
    gameTimeMs < zombie.smashUntilMs
  );
}

/** True if any Umbrella Leaf plant covers the target (col, lane) within its protection radius. */
function isProtectedByUmbrellaLeaf(
  col: number,
  lane: number,
  plants: Record<string, RuntimePlant>
): boolean {
  for (const plant of Object.values(plants)) {
    if (plant.plantType !== "UMBRELLA_LEAF") continue;
    if (Math.abs(plant.col - col) <= UMBRELLA_LEAF_RADIUS_COLS &&
        Math.abs(plant.row - lane) <= UMBRELLA_LEAF_RADIUS_LANES) {
      return true;
    }
  }
  return false;
}

function startGargantuarSmash(zombie: RuntimeZombie, gameTimeMs: number): RuntimeZombie {
  return {
    ...zombie,
    isEating: false,
    eatTargetId: null,
    smashUntilMs: gameTimeMs + GARGANTUAR_SMASH_RECOVERY_MS,
  };
}

function shouldThrowGargantuarImp(zombie: RuntimeZombie): boolean {
  return (
    zombie.zombieType === "GARGANTUAR" &&
    zombie.hasThrownImp !== true &&
    zombie.health > 0 &&
    zombie.health <= GARGANTUAR_IMP_THROW_HEALTH_THRESHOLD &&
    zombie.x > GARGANTUAR_IMP_THROW_MIN_X
  );
}

function getGargantuarImpLandingX(zombie: RuntimeZombie): number {
  const landingX = Math.round(zombie.x - 5);
  return Math.max(
    GARGANTUAR_IMP_LANDING_MIN_X,
    Math.min(GARGANTUAR_IMP_LANDING_MAX_X, landingX)
  );
}

function applyGargantuarImpThrows(
  zombies: Record<string, RuntimeZombie>,
  env: EnvironmentConfig,
  gameTimeMs: number,
  random: () => number
): Record<string, RuntimeZombie> {
  let updated = { ...zombies };
  for (const [zombieId, zombie] of Object.entries(zombies)) {
    if (!shouldThrowGargantuarImp(zombie)) continue;

    const imp = createRuntimeZombie(
      "IMP",
      zombie.lane,
      getGargantuarImpLandingX(zombie),
      env,
      gameTimeMs,
      random
    );
    updated[zombieId] = { ...zombie, hasThrownImp: true };
    updated[imp.instanceId] = imp;
  }
  return updated;
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
    // PvZ1: hard freeze, then residual chill (half speed) after thaw.
    updated[id] = {
      ...zombie,
      isEating: false,
      eatTargetId: null,
      isFrozen: true,
      statusEffects: [
        ...zombie.statusEffects.filter(
          (effect) => effect.type !== "FROZEN" && effect.type !== "SLOWED"
        ),
        { type: "FROZEN", expiresAtMs: gameTimeMs + ICE_SHROOM_FREEZE_MS },
        {
          type: "SLOWED",
          expiresAtMs: gameTimeMs + ICE_SHROOM_FREEZE_MS + ICE_SHROOM_CHILL_MS,
          factor: 0.5,
        },
      ],
    };
  }
  return updated;
}

function isHypnotizedZombie(zombie: RuntimeZombie): boolean {
  return zombie.statusEffects.some((effect) => effect.type === "HYPNOTIZED");
}

function hypnotizeZombie(zombie: RuntimeZombie): RuntimeZombie {
  return {
    ...zombie,
    isEating: false,
    eatTargetId: null,
    direction: "right",
    statusEffects: [
      ...zombie.statusEffects.filter((effect) => effect.type !== "HYPNOTIZED"),
      { type: "HYPNOTIZED", expiresAtMs: Infinity },
    ],
  };
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
  bowlingNuts: {},
  currentSun: 50,
  cumulativeSun: 0,
  gameTimeMs: 0,
  waveNumber: 0,
  nextWaveAtMs: FIRST_WAVE_AT_MS,
  rngState: DEFAULT_RNG_SEED,
  score: 0,
  totalZombiesKilled: 0,
  loadout: [],
  selectedSlot: null,
  nextSkyDropAtMs: SKY_SUN_INTERVAL_MS,
  nextConveyorAtMs: 1_500,
  waveConfig: null,
  levelRules: { ...DEFAULT_LEVEL_RULES },
  zombieSpawnQueue: [],
  lastPlacementFailure: null,
  waveAnnouncement: null,
  waveAnnouncementUntilMs: 0,
};

interface InitGameOptions {
  waveConfig?: unknown;
  rngSeed?: unknown;
  startingSun?: number;
  levelRules?: Partial<LevelRuntimeRules>;
}

interface GameActions {
  initGame: (env: EnvironmentConfig, loadout: SeedPacketSlot[], options?: InitGameOptions) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  placePlant: (plantType: string, row: number, col: number) => boolean;
  removePlant: (instanceId: string) => void;
  shovePlant: (row: number, col: number) => void;
  collectSunDrop: (dropId: string) => void;
  selectSlot: (slot: number | null) => void;
  queueZombie: (zombieType: string, lane: number, spawnAtMs: number) => void;
  tick: (deltaMs: number) => void;
  reset: () => void;
  clearPlacementFailure: () => void;
}

export type GameStore = GameEngineState & GameActions;

export const useGameStore = create<GameStore>()((set, get) => ({
  ...INITIAL_STATE,

  initGame: (env, loadout, options) => {
    _plantCounter = 0;
    _zombieCounter = 0;
    _sunDropCounter = 0;
    _bowlingCounter = 0;
    resetPlantAiCounters();
    const waveConfig = parseWaveConfig(options?.waveConfig);
    const levelRules: LevelRuntimeRules = {
      ...DEFAULT_LEVEL_RULES,
      ...(options?.levelRules ?? {}),
      conveyorBelt:
        options?.levelRules?.conveyorBelt ??
        env.conveyorBelt ??
        DEFAULT_LEVEL_RULES.conveyorBelt,
    };
    // Conveyor starts empty; cards arrive on the belt over time.
    const initialLoadout =
      levelRules.playMode === "CONVEYOR" || levelRules.conveyorBelt ? [] : loadout;
    set({
      ...INITIAL_STATE,
      status: "idle",
      environment: env,
      grid: generateGrid(env),
      lawnMowers: createLawnMowers(env),
      currentSun: getInitialSun(env, options?.startingSun),
      loadout: initialLoadout,
      nextSkyDropAtMs: SKY_SUN_INTERVAL_MS,
      nextWaveAtMs: FIRST_WAVE_AT_MS,
      nextConveyorAtMs: 1_500,
      waveConfig,
      levelRules,
      bowlingNuts: {},
      waveAnnouncement: null,
      waveAnnouncementUntilMs: 0,
      rngState: createInitialRngState([
        options?.rngSeed,
        env,
        initialLoadout.map((slot) => slot.plantType),
        waveConfig,
        levelRules,
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

  clearPlacementFailure: () => set({ lastPlacementFailure: null }),

  placePlant: (plantType, row, col) => {
    const state = get();

    const fail = (reason: PlacementFailureReason): false => {
      set({ lastPlacementFailure: reason });
      return false;
    };

    if (state.status !== "playing") return fail("GAME_NOT_PLAYING");

    let def;
    try { def = getPlantDef(plantType); } catch { return fail("INVALID_PLANT_TYPE"); }

    const freePlacement = state.levelRules.freePlacement || state.levelRules.playMode === "CONVEYOR";
    const isBowling = state.levelRules.playMode === "BOWLING";
    const isConveyor =
      state.levelRules.playMode === "CONVEYOR" || state.levelRules.conveyorBelt;

    // Wall-nut Bowling: launch a rolling nut down the chosen lane (row).
    if (isBowling) {
      const loadoutIndex = state.loadout.findIndex((slot) => slot.plantType === plantType);
      if (loadoutIndex < 0) return fail("INVALID_PLANT_TYPE");
      if (state.loadout[loadoutIndex].cooldownRemainingMs > 0) return fail("ON_COOLDOWN");
      if (row < 0 || row >= state.environment.gridRows) return fail("INVALID_CELL");

      const nut = createBowlingNut(plantType, row);
      // Consume one bowling card; bowling packets recharge quickly like a mini-game supply.
      const loadout = state.loadout.map((slot, index) =>
        index === loadoutIndex
          ? { ...slot, cooldownRemainingMs: Math.max(800, slot.cooldownTotalMs || 1_200) }
          : slot
      );
      set({
        bowlingNuts: { ...state.bowlingNuts, [nut.instanceId]: nut },
        loadout,
        selectedSlot: null,
        lastPlacementFailure: null,
      });
      return true;
    }

    const cell = getCell(state.grid, row, col);
    if (!cell) return fail("INVALID_CELL");

    const loadoutIndex = state.loadout.findIndex((slot) => slot.plantType === plantType);
    const loadoutSlot = loadoutIndex >= 0 ? state.loadout[loadoutIndex] : null;
    if (loadoutSlot && loadoutSlot.cooldownRemainingMs > 0) return fail("ON_COOLDOWN");
    // Conveyor: must spend a card from the belt (not infinite free plants).
    if (isConveyor && loadoutIndex < 0) return fail("INVALID_PLANT_TYPE");

    let loadout = state.loadout;
    const rechargeSeed = () => {
      if (!loadoutSlot) return loadout;
      // Conveyor removes the spent card instead of recharging.
      if (isConveyor) {
        return state.loadout
          .filter((_, index) => index !== loadoutIndex)
          .map((slot, index) => ({ ...slot, slotIndex: index }));
      }
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
      if (!target) return fail("NO_SLEEPING_MUSHROOM");

      const newSun = freePlacement
        ? state.currentSun
        : spendSun(state.currentSun, def.sunCost);
      if (newSun === null) return fail("INSUFFICIENT_SUN");

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
          lastPlacementFailure: null,
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
        lastPlacementFailure: null,
      });
      return true;
    }

    const newSun = freePlacement
      ? state.currentSun
      : spendSun(state.currentSun, def.sunCost);
    if (newSun === null) return fail("INSUFFICIENT_SUN");

    const placementOpts = {
      isAquatic: def.isAquatic,
      requiresLilyPad: cell.isWater && !def.isAquatic,
      requiresFlowerPot: cell.isSlope && !isFlowerPotPlant(plantType),
      isLilyPad: isLilyPadPlant(plantType),
      isFlowerPot: isFlowerPotPlant(plantType),
      isPumpkin: isPumpkinPlant(plantType),
      isGraveBuster: plantType === "GRAVE_BUSTER",
    };
    if (!canPlantHere(state.grid, row, col, placementOpts)) {
      return fail(getPlacementFailureReason(state.grid, row, col, placementOpts) ?? "OCCUPIED");
    }

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
        plantedAtMs: state.gameTimeMs,
        isSleeping: true,
        isCharging: false,
        chargeEndsAtMs: 0,
        armedAtMs: null,
        blocksAerial: def.blocksAerial,
      };
      const newGrid = cloneGrid(state.grid);
      setPlantInCorrectSlot(newGrid, row, col, plantType, instanceId);

      set({
        plants: { ...state.plants, [instanceId]: plant },
        currentSun: newSun,
        grid: newGrid,
        loadout,
        selectedSlot: null,
        lastPlacementFailure: null,
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
        lastPlacementFailure: null,
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
      plantedAtMs: state.gameTimeMs,
      isSleeping: shouldMushroomSleep(def, state.environment),
      isCharging: plantType === "POTATO_MINE" || plantType === "GRAVE_BUSTER",
      chargeEndsAtMs:
        plantType === "POTATO_MINE"
          ? state.gameTimeMs + POTATO_MINE_ARM_MS
          : plantType === "GRAVE_BUSTER"
            ? state.gameTimeMs + GRAVE_BUSTER_DURATION_MS
            : 0,
      armedAtMs: null,
      blocksAerial: def.blocksAerial,
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
      lastPlacementFailure: null,
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

  shovePlant: (row, col) => {
    const state = get();
    const entry = Object.entries(state.plants).find(
      ([, p]) => p.row === row && p.col === col
    );
    if (!entry) return;
    const [instanceId, plant] = entry;

    const newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
    setPlantInCorrectSlot(newGrid, plant.row, plant.col, plant.plantType, null);
    const { [instanceId]: _removed, ...restPlants } = state.plants;

    set({ plants: restPlants, grid: newGrid });
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
    let waveAnnouncement: WaveAnnouncementKind = state.waveAnnouncement;
    let waveAnnouncementUntilMs = state.waveAnnouncementUntilMs;
    let nextConveyorAtMs = state.nextConveyorAtMs;
    let bowlingNuts: Record<string, RuntimeBowlingNut> = { ...state.bowlingNuts };
    // Seeded RNG for all in-tick randomness (sky sun position, zombie spawn flavor,
    // dancing zombie lanes, etc.) so saved games replay deterministically.
    const nextRandom = () => {
      const result = nextRandomValue(rngState);
      rngState = result.rngState;
      return result.value;
    };

    // PvZ-like wave pacing:
    // - earliest start at nextWaveAtMs
    // - previous wave must finish spawning (queue empty for pending entries is checked via living+queue)
    // - lawn mostly clear (stricter for flag/final waves)
    // - after starting, next earliest is max(min interval, end of this wave's spawn train + rest)
    if (newGameTimeMs >= nextWaveAtMs) {
      const newWaveNumber = waveNumber + 1;
      const livingCount = Object.keys(state.zombies).length;
      const pendingSpawns = zombieSpawnQueue.length;
      const waveProbe = generateWave(newWaveNumber, env.gridRows, rngState, state.waveConfig);
      const isBigWave = waveProbe.isFlagWave || waveProbe.isFinalWave;
      const maxRemaining = isBigWave
        ? WAVE_FLAG_ADVANCE_MAX_REMAINING
        : WAVE_ADVANCE_MAX_REMAINING;
      // First wave always starts when the timer hits (setup sun phase).
      const boardClearEnough =
        waveNumber === 0 || (pendingSpawns === 0 && livingCount <= maxRemaining);

      if (boardClearEnough) {
        rngState = waveProbe.rngState;
        const entries = waveProbe.entries;
        const newEntries = entries.map((entry) => ({
          zombieType: entry.zombieType,
          lane: entry.lane,
          spawnAtMs: newGameTimeMs + entry.spawnAtMs,
          ...(entry.x !== undefined ? { x: entry.x } : {}),
        }));
        zombieSpawnQueue = [...zombieSpawnQueue, ...newEntries];
        if (env.gravesEnabled && (newWaveNumber % 5 === 0 || waveProbe.isFlagWave || waveProbe.isFinalWave)) {
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
        // Huge / final wave announcement banner
        if (waveProbe.isFinalWave) {
          waveAnnouncement = "final";
          waveAnnouncementUntilMs = newGameTimeMs + HUGE_WAVE_BANNER_MS;
        } else if (waveProbe.isFlagWave) {
          waveAnnouncement = "huge";
          waveAnnouncementUntilMs = newGameTimeMs + HUGE_WAVE_BANNER_MS;
        }
        const lastSpawnOffset = entries.reduce(
          (latest, entry) => Math.max(latest, entry.spawnAtMs),
          0
        );
        // Do not schedule the next wave until this wave's spawn train is done + rest.
        nextWaveAtMs =
          newGameTimeMs +
          Math.max(WAVE_INTERVAL_MS, lastSpawnOffset + WAVE_REST_AFTER_SPAWN_MS);
      }
      // else: timer ready but lawn not clear yet — hold wave; keep nextWaveAtMs as-is
    }

    // Clear expired wave banner
    if (waveAnnouncement && newGameTimeMs >= waveAnnouncementUntilMs) {
      waveAnnouncement = null;
      waveAnnouncementUntilMs = 0;
    }

    // -----------------------------------------------------------------------
    // 4. Spawn zombies from queue
    // -----------------------------------------------------------------------
    const toSpawn = zombieSpawnQueue.filter((e) => e.spawnAtMs <= newGameTimeMs);
    const remainingQueue = zombieSpawnQueue.filter((e) => e.spawnAtMs > newGameTimeMs);

    let zombies: Record<string, RuntimeZombie> = { ...state.zombies };
    for (const entry of toSpawn) {
      const lane = resolveAquaticSpawnLane(entry.zombieType, entry.lane, env);
      const zombie = createRuntimeZombie(entry.zombieType, lane, entry.x ?? ZOMBIE_SPAWN_X, env, newGameTimeMs, nextRandom);
      zombies[zombie.instanceId] = zombie;
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
      const col = Math.floor(nextRandom() * env.gridCols);
      const targetRow = 1 + Math.floor(nextRandom() * 3);
      const drop = createSkySunDrop(newGameTimeMs, id, col, targetRow);
      sunDrops = { ...sunDrops, [id]: drop };
      nextSkyDropAtMs = skyResult.nextSkyDropAtMs;
    }

    // -----------------------------------------------------------------------
    // 7. Plant AI loop
    // -----------------------------------------------------------------------
    let plants = { ...state.plants };
    let projectiles = { ...state.projectiles };
    let loadout = state.loadout.map((slot) => ({
      ...slot,
      cooldownRemainingMs: Math.max(0, slot.cooldownRemainingMs - deltaMs),
    }));

    // Conveyor-belt: deliver free plant cards over time.
    const conveyorActive =
      state.levelRules.playMode === "CONVEYOR" || state.levelRules.conveyorBelt;
    if (conveyorActive && state.levelRules.conveyorPlantPool.length > 0) {
      const cap = Math.max(1, state.levelRules.conveyorSlotCap);
      const interval = Math.max(1_000, state.levelRules.conveyorIntervalMs || CONVEYOR_DEFAULT_INTERVAL_MS);
      while (newGameTimeMs >= nextConveyorAtMs && loadout.length < cap) {
        const pool = state.levelRules.conveyorPlantPool;
        const plantType = pool[Math.floor(nextRandom() * pool.length)] ?? pool[0];
        loadout = [...loadout, makeConveyorSlot(plantType, loadout.length)];
        nextConveyorAtMs += interval;
      }
      if (loadout.length >= cap && newGameTimeMs >= nextConveyorAtMs) {
        // Belt full — delay next card until a slot frees up.
        nextConveyorAtMs = newGameTimeMs + interval;
      }
    }

    // Bowling nuts: roll right and damage zombies once each.
    if (Object.keys(bowlingNuts).length > 0) {
      const advancedNuts: Record<string, RuntimeBowlingNut> = {};
      for (const [id, nut] of Object.entries(bowlingNuts)) {
        let current = {
          ...nut,
          x: nut.x + nut.speedColsPerSec * (deltaMs / 1000),
          hitZombieIds: [...nut.hitZombieIds],
        };
        if (current.x > env.gridCols + 1) {
          continue; // left the lawn
        }

        const laneZombies = Object.values(zombies).filter(
          (z) =>
            z.lane === current.lane &&
            !z.isUnderground &&
            Math.abs(z.x - current.x) <= 0.55 &&
            !current.hitZombieIds.includes(z.instanceId)
        );

        if (laneZombies.length > 0) {
          if (current.isExplosive) {
            // Explode-o-nut: damage all zombies in lane near the nut.
            for (const z of Object.values(zombies)) {
              if (z.lane !== current.lane || z.isUnderground) continue;
              if (Math.abs(z.x - current.x) > 1.2) continue;
              const damaged = {
                ...z,
                health: Math.max(0, z.health - current.damage),
                armorHealth: 0,
              };
              if (damaged.health <= 0) {
                score += scoreKilledZombie(z);
                totalZombiesKilled += 1;
                const { [z.instanceId]: _dead, ...rest } = zombies;
                zombies = rest;
              } else {
                zombies[z.instanceId] = damaged;
              }
            }
            continue; // nut consumed
          }

          // Normal wall-nut: hit closest zombie once and keep rolling.
          laneZombies.sort((a, b) => a.x - b.x);
          const target = laneZombies[0];
          current.hitZombieIds.push(target.instanceId);
          let remaining = current.damage;
          let armor = target.armorHealth;
          let health = target.health;
          if (armor > 0) {
            const absorbed = Math.min(armor, remaining);
            armor -= absorbed;
            remaining -= absorbed;
          }
          health = Math.max(0, health - remaining);
          if (health <= 0) {
            score += scoreKilledZombie(target);
            totalZombiesKilled += 1;
            const { [target.instanceId]: _dead, ...rest } = zombies;
            zombies = rest;
          } else {
            zombies[target.instanceId] = {
              ...target,
              health,
              armorHealth: armor,
            };
          }
        }

        advancedNuts[id] = current;
      }
      bowlingNuts = advancedNuts;
    }

    let gridChanged = false;
    let newGrid = state.grid;

    for (const [plantId, plant] of Object.entries(plants)) {
      let currentPlant = plant;
      let def;
      try { def = getPlantDef(currentPlant.plantType); } catch { continue; }

      // 7a. PvZ1: Puff-shroom / Marigold never expire on a timer.

      // Grave Buster removes the grave after a short chomp animation, then is spent.
      if (
        currentPlant.plantType === "GRAVE_BUSTER" &&
        currentPlant.isCharging &&
        newGameTimeMs >= currentPlant.chargeEndsAtMs
      ) {
        if (!gridChanged) { newGrid = cloneGrid(state.grid); gridChanged = true; }
        const cell = newGrid[currentPlant.row]?.[currentPlant.col];
        if (cell) cell.graveId = null;
        setPlantInCorrectSlot(newGrid, currentPlant.row, currentPlant.col, currentPlant.plantType, null);
        const { [plantId]: _spentGraveBuster, ...remainingPlants } = plants;
        plants = remainingPlants;
        continue;
      }

      // Marigold produces coins (score), never sun.
      if (
        currentPlant.plantType === "MARIGOLD" &&
        !currentPlant.isSleeping &&
        newGameTimeMs - currentPlant.lastAttackAtMs >= MARIGOLD_COIN_INTERVAL_MS
      ) {
        const gold = nextRandom() < MARIGOLD_GOLD_CHANCE;
        score += gold ? MARIGOLD_GOLD_COIN_SCORE : MARIGOLD_SILVER_COIN_SCORE;
        currentPlant = { ...currentPlant, lastAttackAtMs: newGameTimeMs };
      }

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
      if (shouldPlantAttack(currentPlant, def, newGameTimeMs, zombies, env.gridRows, env)) {
        const fireResult = plantFire(
          currentPlant,
          def,
          newGameTimeMs,
          zombies,
          env.gridRows,
          nextRandom,
          env
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
        const onSpike = Object.entries(zombies).filter(([, zombie]) =>
          zombie.lane === plant.row &&
          !zombie.isUnderground &&
          !zombie.isAerial &&
          !isHypnotizedZombie(zombie) &&
          zombie.x >= plant.col - 0.45 &&
          zombie.x <= plant.col + 0.45
        );
        if (onSpike.length === 0) continue;

        // PvZ1: Spikeweed punctures Zomboni / Catapult in one hit and is destroyed.
        const vehicle = onSpike.find(([, z]) => z.zombieType === "ZOMBONI" || z.zombieType === "CATAPULT");
        if (vehicle) {
          const [zombieId, zombie] = vehicle;
          score += scoreKilledZombie(zombie);
          totalZombiesKilled += 1;
          const { [zombieId]: _killedVehicle, ...remainingZombies } = zombies;
          zombies = remainingZombies;
          if (!gridChanged) {
            newGrid = cloneGrid(state.grid);
            gridChanged = true;
          }
          setPlantInCorrectSlot(newGrid, plant.row, plant.col, plant.plantType, null);
          const { [plantId]: _spentSpike, ...remainingPlants } = plants;
          plants = remainingPlants;
          continue;
        }

        const result = damageZombiesInArea(
          zombies,
          (zombie) =>
            zombie.lane === plant.row &&
            !zombie.isAerial &&
            !isHypnotizedZombie(zombie) &&
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

      if (plant.plantType === "MAGNET_SHROOM") {
        if (plant.isSleeping) continue;
        const def = getPlantDef("MAGNET_SHROOM");
        if (def.attackCooldownMs === null || newGameTimeMs - plant.lastAttackAtMs < def.attackCooldownMs) {
          continue;
        }
        // Find nearest zombie with magnetic armor within range
        let magnetTarget: RuntimeZombie | null = null;
        let magnetTargetId: string | null = null;
        for (const [zId, zombie] of Object.entries(zombies)) {
          if (zombie.isUnderground || zombie.isAerial) continue;
          if (!MAGNETIC_ZOMBIE_TYPES.has(zombie.zombieType)) continue;
          if (zombie.armorHealth <= 0) continue;
          if (Math.abs(zombie.lane - plant.row) > MAGNET_SHROOM_RANGE_LANES) continue;
          if (Math.abs(zombie.x - plant.col) > MAGNET_SHROOM_RANGE_COLS) continue;
          if (magnetTarget === null || zombie.x < magnetTarget.x) {
            magnetTarget = zombie;
            magnetTargetId = zId;
          }
        }
        if (!magnetTarget || !magnetTargetId) continue;

        zombies = {
          ...zombies,
          [magnetTargetId]: { ...magnetTarget, armorHealth: 0 },
        };
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
    const dancerSpawns: Array<{ lane: number; x: number }> = [];

    for (const [zombieId, zombie] of Object.entries(zombies)) {
      // 8a. Tick status effects
      let z = tickStatusEffects(zombie, newGameTimeMs);
      if (shouldDiggerEmerge(z)) {
        z = emergeDigger(z, newGameTimeMs);
      }
      if (z.isEating && z.zombieType === "SNORKEL" && z.isSubmerged) {
        z = { ...z, isSubmerged: false };
      }

      // 8a-newspaper. Enrage when newspaper armor is destroyed
      if (z.zombieType === "NEWSPAPER" && z.armorHealth <= 0 && !z.isEnraged) {
        z = { ...z, isEnraged: true, speedColsPerSec: NEWSPAPER_ENRAGED_SPEED_COLS_PER_SEC };
      }

      // 8a-jackbox. Explode when timer fires
      if (z.zombieType === "JACK_IN_THE_BOX" && z.jackboxExplodeAtMs !== undefined && newGameTimeMs >= z.jackboxExplodeAtMs) {
        const explodeX = z.x;
        const explodeLane = z.lane;
        // Kill zombies in 3×3 area (including allied zombies — PvZ1 accurate)
        const blastResult = damageZombiesInArea(
          zombies,
          (zb) => Math.abs(zb.lane - explodeLane) <= 1 && Math.abs(zb.x - explodeX) <= 1.5,
          1800
        );
        zombies = blastResult.zombies;
        score += blastResult.scoreDelta;
        totalZombiesKilled += blastResult.killedCount;
        // Destroy plants in 3×3 area
        for (const [pid, p] of Object.entries(plants)) {
          if (Math.abs(p.row - explodeLane) <= 1 && Math.abs(p.col - explodeX) <= 1.5) {
            if (!gridChanged) { newGrid = cloneGrid(state.grid); gridChanged = true; }
            setPlantInCorrectSlot(newGrid, p.row, p.col, p.plantType, null);
            const { [pid]: _blasted, ...rest } = plants;
            plants = rest;
          }
        }
        continue; // zombie itself is consumed in the explosion
      }

      // 8a-dancing. PvZ1: summon a cross of 4 Backup Dancers (front, back, up, down).
      if (z.zombieType === "DANCING" && !z.hasCalledDancers && z.x <= DANCING_ZOMBIE_CALL_X) {
        z = { ...z, hasCalledDancers: true };
        dancerSpawns.push({ lane: z.lane, x: z.x - 0.8 }); // front (toward house)
        dancerSpawns.push({ lane: z.lane, x: z.x + 0.8 }); // back
        if (z.lane - 1 >= 0) dancerSpawns.push({ lane: z.lane - 1, x: z.x });
        if (z.lane + 1 < env.gridRows) dancerSpawns.push({ lane: z.lane + 1, x: z.x });
      }

      // Hypnotized zombies fight other zombies instead of plants (walk right, bite enemies).
      if (isHypnotizedZombie(z) && !isZombieImmobilized(z)) {
        const enemy = Object.entries(zombies).find(([, other]) =>
          other.instanceId !== z.instanceId &&
          !isHypnotizedZombie(other) &&
          other.lane === z.lane &&
          Math.abs(other.x - z.x) <= 0.55
        );
        if (enemy) {
          const [enemyId, enemyZombie] = enemy;
          const damagedEnemy = applyProjectileDamage(enemyZombie, z.eatDamagePerSec * (deltaMs / 1000));
          if (isZombieDead(damagedEnemy)) {
            score += scoreKilledZombie(enemyZombie);
            totalZombiesKilled += 1;
            const { [enemyId]: _killed, ...rest } = zombies;
            zombies = rest;
          } else {
            zombies[enemyId] = damagedEnemy;
          }
          z = { ...z, isEating: true, eatTargetId: enemyId };
        } else {
          z = stopEating(z);
        }
        zombies[zombieId] = z;
        continue;
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

          // PvZ1 Hypno-shroom: when fully eaten while awake, the eater becomes friendly.
          // Sleeping Hypno-shroom is just a snack (no hypnosis).
          if (
            isPlantDead(damagedPlant) &&
            targetPlant.plantType === "HYPNO_SHROOM" &&
            !targetPlant.isSleeping
          ) {
            if (!gridChanged) {
              newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
              gridChanged = true;
            }
            setPlantInCorrectSlot(newGrid, damagedPlant.row, damagedPlant.col, damagedPlant.plantType, null);
            const { [targetId]: _dead, ...remainingPlants } = plants;
            plants = remainingPlants;
            z = hypnotizeZombie(z);
            zombies[zombieId] = z;
            continue;
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
      if (
        !z.isEating &&
        !isZombieImmobilized(z) &&
        !isDiggerEmerging(z, newGameTimeMs) &&
        !isGargantuarSmashing(z, newGameTimeMs)
      ) {
        if (shouldSnorkelSubmerge(z, env) && !z.isSubmerged) {
          z = { ...z, isSubmerged: true };
        }
        const foundEatTarget = chooseZombieEatTarget(z, plants);
        if (foundEatTarget) {
          if (z.zombieType === "GARGANTUAR") {
            if (!gridChanged) {
              newGrid = cloneGrid(state.grid);
              gridChanged = true;
            }
            setPlantInCorrectSlot(newGrid, foundEatTarget.row, foundEatTarget.col, foundEatTarget.plantType, null);
            const { [foundEatTarget.instanceId]: _smashedPlant, ...remainingPlants } = plants;
            plants = remainingPlants;
            z = startGargantuarSmash(z, newGameTimeMs);
          } else if (canDolphinJumpTarget(z, foundEatTarget, env, plants)) {
            z = jumpDolphinOverPlant(z, foundEatTarget);
          } else if (canPoleVaultJumpTarget(z, foundEatTarget, plants)) {
            z = jumpPoleVaultOverPlant(z, foundEatTarget);
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

      // 8d-bungee. Bungee zombie grab: steals plant at its position after delay.
      if (z.zombieType === "BUNGEE" && typeof z.bungeeGrabAtMs === "number" && newGameTimeMs >= z.bungeeGrabAtMs) {
        const bungeeCol = Math.round(z.x);
        const bungeeLane = z.lane;
        const protected_ = isProtectedByUmbrellaLeaf(bungeeCol, bungeeLane, plants);

        if (!protected_) {
          // Find any plant in the bungee's target cell (prefer ground layer)
          const targetPlant = Object.values(plants).find(
            (p) => p.row === bungeeLane && p.col === bungeeCol
          );
          if (targetPlant) {
            if (!gridChanged) {
              newGrid = cloneGrid(state.grid);
              gridChanged = true;
            }
            setPlantInCorrectSlot(newGrid, targetPlant.row, targetPlant.col, targetPlant.plantType, null);
            const { [targetPlant.instanceId]: _grabbed, ...remainingPlants } = plants;
            plants = remainingPlants;
          }
        }
        // Bungee retreats regardless (protected or grabbed, it leaves)
        const { [zombieId]: _bungee, ...remainingZombies } = zombies;
        zombies = remainingZombies;
        continue;
      }

      // 8d-catapult. Catapult zombie: periodically fires a basketball at the nearest plant ahead.
      if (z.zombieType === "CATAPULT" && !z.isEating && !z.isFrozen) {
        const timeSinceLastFire = newGameTimeMs - (z.catapultLastFireAtMs ?? 0);
        if (timeSinceLastFire >= CATAPULT_FIRE_INTERVAL_MS) {
          // Find nearest plant ahead (to the left, toward house) within range
          const catapultTarget = Object.values(plants).find(
            (p) => p.row === z.lane && p.col < z.x && p.col >= z.x - CATAPULT_FIRE_RANGE_COLS
          );
          if (catapultTarget) {
            // Umbrella Leaf blocks things lobbed from above: Catapult basketballs and Bungee grabs (PvZ1 accurate).
            if (!isProtectedByUmbrellaLeaf(catapultTarget.col, catapultTarget.row, plants)) {
              const damaged = { ...catapultTarget, health: catapultTarget.health - CATAPULT_BASKETBALL_DAMAGE };
              if (damaged.health <= 0) {
                if (!gridChanged) {
                  newGrid = cloneGrid(state.grid);
                  gridChanged = true;
                }
                setPlantInCorrectSlot(newGrid, damaged.row, damaged.col, damaged.plantType, null);
                const { [catapultTarget.instanceId]: _dead, ...remainingPlants } = plants;
                plants = remainingPlants;
              } else {
                plants[catapultTarget.instanceId] = damaged;
              }
            }
            z = { ...z, catapultLastFireAtMs: newGameTimeMs };
          }
        }
      }

      // 8d. If not eating and not frozen, move the zombie
      if (
        !z.isEating &&
        !z.isFrozen &&
        !isDiggerEmerging(z, newGameTimeMs) &&
        !isGargantuarSmashing(z, newGameTimeMs)
      ) {
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

      // Hypnotized zombies that walk off the right edge of the lawn leave play.
      if (isHypnotizedZombie(z) && z.x > env.gridCols + 0.5) {
        const { [zombieId]: _escapedAlly, ...remainingZombies } = zombies;
        zombies = remainingZombies;
        continue;
      }

      zombies[zombieId] = z;
    }

    // Spawn Backup Dancers queued during Dancing Zombie trigger
    for (const spawn of dancerSpawns) {
      const dancer = createRuntimeZombie("BACKUP_DANCER", spawn.lane, spawn.x, env, newGameTimeMs, nextRandom);
      zombies[dancer.instanceId] = dancer;
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
    zombies = applyGargantuarImpThrows(zombies, env, newGameTimeMs, nextRandom);

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
    if (waveNumber >= getFinalWaveNumber(state.waveConfig) && zombieCount === 0 && remainingQueue.length === 0) {
      set({
        status: "victory",
        gameTimeMs: newGameTimeMs,
        waveNumber,
        nextWaveAtMs,
        zombieSpawnQueue: remainingQueue,
        sunDrops,
        nextSkyDropAtMs,
        nextConveyorAtMs,
        plants,
        zombies,
        lawnMowers,
        projectiles,
        bowlingNuts,
        loadout,
        rngState,
        score,
        totalZombiesKilled,
        waveAnnouncement,
        waveAnnouncementUntilMs,
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
      nextConveyorAtMs,
      plants,
      zombies,
      lawnMowers,
      projectiles,
      bowlingNuts,
      loadout,
      rngState,
      score,
      totalZombiesKilled,
      waveAnnouncement,
      waveAnnouncementUntilMs,
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
