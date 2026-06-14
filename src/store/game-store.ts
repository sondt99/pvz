import { create } from "zustand";
import type {
  GameEngineState,
  EnvironmentConfig,
  RuntimePlant,
  RuntimeZombie,
  SeedPacketSlot,
} from "../engine/types";
import { generateGrid, getCell, canPlantHere, setPlantOnCell } from "../engine/grid";
import { getInitialSun, tickSkySun, spendSun, collectSun, createSkySunDrop, advanceSunDrop, isSunDropExpired } from "../engine/sun";
import { getPlantDef } from "../engine/entities/plant-defs";
import { getZombieDef } from "../engine/entities/zombie-defs";
import { SKY_SUN_INTERVAL_MS, SKY_SUN_FALL_SPEED_PER_MS, SUN_PRODUCER_INITIAL_DELAY_MS, WAVE_INTERVAL_MS, ZOMBIE_SPAWN_X } from "../engine/constants";
import { resetPlantAiCounters, shouldPlantAttack, plantFire, plantProduceSun } from "../engine/ai/plant-ai";
import {
  tickStatusEffects,
  isZombieEatingPlant,
  startEating,
  stopEating,
  applyEatingDamage,
  moveZombie,
} from "../engine/ai/zombie-ai";
import {
  advanceProjectile,
  shouldRemoveProjectile,
  findStraightHits,
  findLobbedHits,
  applyProjectileHits,
} from "../engine/ai/projectile-ai";
import { generateWave } from "../engine/wave-generator";
import { isPlantDead } from "../engine/physics/collision";

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
  currentSun: 50,
  cumulativeSun: 0,
  gameTimeMs: 0,
  waveNumber: 0,
  nextWaveAtMs: WAVE_INTERVAL_MS,
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
      currentSun: getInitialSun(env),
      loadout,
      nextSkyDropAtMs: SKY_SUN_INTERVAL_MS,
      nextWaveAtMs: WAVE_INTERVAL_MS,
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

    if (!getCell(state.grid, row, col)) return false;

    const newSun = spendSun(state.currentSun, def.sunCost);
    if (newSun === null) return false;

    if (!canPlantHere(state.grid, row, col, {
      isAquatic: def.isAquatic,
      requiresLilyPad: def.requiresLilyPad,
      requiresFlowerPot: def.requiresFlowerPot,
    })) return false;

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
      isSleeping: def.isMushroomType && state.environment.type !== "NIGHT",
      isCharging: false, chargeEndsAtMs: 0, armedAtMs: null,
    };

    // Deep-clone the grid rows we need to mutate
    const newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
    setPlantOnCell(newGrid, row, col, instanceId);

    set({
      plants: { ...state.plants, [instanceId]: plant },
      currentSun: newSun,
      grid: newGrid,
    });
    return true;
  },

  removePlant: (instanceId) => {
    const state = get();
    const plant = state.plants[instanceId];
    if (!plant) return;

    const newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
    setPlantOnCell(newGrid, plant.row, plant.col, null);

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
      zombies[id] = {
        instanceId: id,
        zombieType: entry.zombieType,
        lane: entry.lane,
        x: ZOMBIE_SPAWN_X,
        health: def.health, maxHealth: def.health,
        armorHealth: def.armorHealth,
        speedColsPerSec: def.speedColsPerSec,
        eatDamagePerSec: def.eatDamagePerSec,
        isEating: false, eatTargetId: null,
        statusEffects: [],
        isUnderground: def.isUnderground,
        isAerial: def.isAerial,
        isFrozen: false,
      };
    }

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

    for (const [plantId, plant] of Object.entries(plants)) {
      let currentPlant = plant;
      let def;
      try { def = getPlantDef(currentPlant.plantType); } catch { continue; }

      // 7b. Sun production
      const sunResult = plantProduceSun(currentPlant, def, newGameTimeMs);
      if (sunResult.sunDrop) {
        sunDrops = { ...sunDrops, [sunResult.sunDrop.instanceId]: sunResult.sunDrop };
        currentPlant = sunResult.updatedPlant;
      }

      // 7c. Attack
      if (shouldPlantAttack(currentPlant, def, newGameTimeMs, zombies)) {
        const fireResult = plantFire(currentPlant, def, newGameTimeMs, zombies);
        if (fireResult.projectile) {
          projectiles = { ...projectiles, [fireResult.projectile.instanceId]: fireResult.projectile };
          currentPlant = fireResult.updatedPlant;
        }
      }

      plants[plantId] = currentPlant;
    }

    // -----------------------------------------------------------------------
    // 8. Zombie AI loop
    // -----------------------------------------------------------------------
    // We may need to update the grid if a plant dies from eating
    let gridChanged = false;
    let newGrid = state.grid;

    for (const [zombieId, zombie] of Object.entries(zombies)) {
      // 8a. Tick status effects
      let z = tickStatusEffects(zombie, newGameTimeMs);

      // 8b. If eating, check if target plant still exists and is alive
      if (z.isEating && z.eatTargetId) {
        const targetPlant = plants[z.eatTargetId];
        if (targetPlant && !isPlantDead(targetPlant)) {
          // Apply eating damage to the plant
          const damagedPlant = applyEatingDamage(targetPlant, z, deltaMs);
          plants[z.eatTargetId] = damagedPlant;

          // If plant just died from eating damage, remove it
          if (isPlantDead(damagedPlant)) {
            if (!gridChanged) {
              newGrid = state.grid.map((r) => r.map((c) => ({ ...c })));
              gridChanged = true;
            }
            setPlantOnCell(newGrid, damagedPlant.row, damagedPlant.col, null);
            const { [z.eatTargetId]: _dead, ...remainingPlants } = plants;
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
            setPlantOnCell(newGrid, targetPlant.row, targetPlant.col, null);
            const { [z.eatTargetId]: _dead, ...remainingPlants } = plants;
            plants = remainingPlants;
          }
          z = stopEating(z);
        }
      }

      // 8c. If not eating, check if zombie should start eating a plant
      if (!z.isEating) {
        let foundEatTarget: RuntimePlant | null = null;
        for (const plant of Object.values(plants)) {
          if (isZombieEatingPlant(z, plant)) {
            foundEatTarget = plant;
            break;
          }
        }
        if (foundEatTarget) {
          z = startEating(z, foundEatTarget.instanceId);
        }
      }

      // 8d. If not eating and not frozen, move the zombie
      if (!z.isEating && !z.isFrozen) {
        z = moveZombie(z, deltaMs);
      }

      // 8e. Check game-over: zombie reached the house
      if (z.x <= -0.5) {
        set({ status: "game-over" });
        return;
      }

      zombies[zombieId] = z;
    }

    // -----------------------------------------------------------------------
    // 9. Projectile AI loop
    // -----------------------------------------------------------------------
    let score = state.score;
    let totalZombiesKilled = state.totalZombiesKilled;
    const updatedProjectiles: typeof projectiles = {};

    for (const [projId, proj] of Object.entries(projectiles)) {
      // 9a. Advance
      const advanced = advanceProjectile(proj, deltaMs);

      // 9b. Find hits
      const hitIds = advanced.trajectory === "straight"
        ? findStraightHits(advanced, zombies)
        : findLobbedHits(advanced, zombies);

      // 9c. Apply hits
      const hitResult = applyProjectileHits(advanced, zombies, hitIds);
      zombies = hitResult.updatedZombies;

      // 9d. Score killed zombies
      for (const killedId of hitResult.killedZombieIds) {
        const killedZombie = zombies[killedId];
        if (killedZombie) {
          try {
            const zombieDef = getZombieDef(killedZombie.zombieType);
            score += zombieDef.scoreValue;
          } catch { /* unknown zombie type */ }
          totalZombiesKilled += 1;
        }
      }

      // 9e. Remove dead zombies
      for (const killedId of hitResult.killedZombieIds) {
        const { [killedId]: _killed, ...rest } = zombies;
        zombies = rest;
      }

      // 9f. Keep or discard projectile
      const shouldRemove = shouldRemoveProjectile(advanced, env.gridCols) || hitResult.removeProjectile;
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
        setPlantOnCell(newGrid, plant.row, plant.col, null);
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
        projectiles,
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
      projectiles,
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
    set({ ...INITIAL_STATE, grid: [] });
  },
}));
