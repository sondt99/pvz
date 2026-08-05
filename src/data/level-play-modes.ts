// ---------------------------------------------------------------------------
// Adventure level play modes (PvZ1-style).
// ---------------------------------------------------------------------------

import { PLAY_MODES, type PlayMode } from "../engine/types";

export { PLAY_MODES, type PlayMode };

export interface LevelPlayRules {
  playMode: PlayMode;
  /** Starting sun for the level (bowling/conveyor typically 0). */
  startingSun: number;
  /** Session uses conveyor plant delivery. */
  conveyorBelt: boolean;
  /** Override sky sun; null means environment default. */
  skyDropSun: boolean | null;
  /** Skip free multi-plant seed chooser (fixed / special loadout). */
  skipSeedChooser: boolean;
  /** Planting does not cost sun. */
  freePlacement: boolean;
  /** Hide sun counter in HUD. */
  hideSunHud: boolean;
  /** Conveyor plant pool (engine types). */
  conveyorPlantPool: string[];
  conveyorIntervalMs: number;
  conveyorSlotCap: number;
  /** Bowling nut types (engine plant types). */
  bowlingNutTypes: string[];
}

export const DEFAULT_LEVEL_PLAY_RULES: LevelPlayRules = {
  playMode: "NORMAL",
  startingSun: 50,
  conveyorBelt: false,
  skyDropSun: null,
  skipSeedChooser: false,
  freePlacement: false,
  hideSunHud: false,
  conveyorPlantPool: [],
  conveyorIntervalMs: 3_500,
  conveyorSlotCap: 10,
  bowlingNutTypes: ["WALL_NUT"],
};

/** First adventure level that uses the full seed chooser (PvZ1 1-8). */
export const SEED_CHOOSER_FROM_LEVEL = 8;

/** Shovel unlocks after completing this adventure level (PvZ1 1-4). */
export const SHOVEL_UNLOCK_AFTER_LEVEL = 4;

export function isPlayMode(value: unknown): value is PlayMode {
  return typeof value === "string" && (PLAY_MODES as readonly string[]).includes(value);
}

export function shovelUnlockedFromCompleted(completedLevelNumbers: Iterable<number>): boolean {
  for (const n of completedLevelNumbers) {
    if (n >= SHOVEL_UNLOCK_AFTER_LEVEL) return true;
  }
  return false;
}

export function shouldRequireSeedChooser(
  levelNumber: number | null,
  rules: Pick<LevelPlayRules, "playMode" | "skipSeedChooser">
): boolean {
  if (rules.skipSeedChooser) return false;
  if (rules.playMode === "BOWLING" || rules.playMode === "CONVEYOR") return false;
  if (levelNumber === null) return true; // freeplay
  return levelNumber >= SEED_CHOOSER_FROM_LEVEL;
}

/** Day 1-10 default plant pool for conveyor levels. */
export const DAY_CONVEYOR_PLANT_POOL = [
  "PEASHOOTER",
  "SUNFLOWER",
  "CHERRY_BOMB",
  "WALL_NUT",
  "POTATO_MINE",
  "SNOW_PEA",
  "CHOMPER",
  "REPEATER",
] as const;

export const BOWLING_NUT_TYPES = ["WALL_NUT", "EXPLODE_O_NUT"] as const;

export function parseLevelRulesFromUnknown(raw: unknown): Partial<LevelPlayRules> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<LevelPlayRules> = {};
  if (isPlayMode(o.playMode)) out.playMode = o.playMode;
  if (typeof o.startingSun === "number") out.startingSun = o.startingSun;
  if (typeof o.conveyorBelt === "boolean") out.conveyorBelt = o.conveyorBelt;
  if (typeof o.skyDropSun === "boolean") out.skyDropSun = o.skyDropSun;
  if (typeof o.skipSeedChooser === "boolean") out.skipSeedChooser = o.skipSeedChooser;
  if (typeof o.freePlacement === "boolean") out.freePlacement = o.freePlacement;
  if (typeof o.hideSunHud === "boolean") out.hideSunHud = o.hideSunHud;
  if (Array.isArray(o.conveyorPlantPool)) {
    out.conveyorPlantPool = o.conveyorPlantPool.filter((p): p is string => typeof p === "string");
  }
  if (typeof o.conveyorIntervalMs === "number") out.conveyorIntervalMs = o.conveyorIntervalMs;
  if (typeof o.conveyorSlotCap === "number") out.conveyorSlotCap = o.conveyorSlotCap;
  if (Array.isArray(o.bowlingNutTypes)) {
    out.bowlingNutTypes = o.bowlingNutTypes.filter((p): p is string => typeof p === "string");
  }
  return out;
}
