// ---------------------------------------------------------------------------
// Adventure-mode plant unlock progression (PvZ1-style).
// Starter: Peashooter. Each completed level's rewardPlantId unlocks for later.
// ---------------------------------------------------------------------------

import { LEVEL_CONFIGS } from "./level-configs";
import { SEED_PLANT_CATALOG, SEED_PLANT_BY_TYPE } from "./seed-catalog";

/** Always available from the first adventure level. */
export const STARTER_PLANT_IDS = ["peashooter"] as const;

/**
 * Plant IDs unlocked after completing the given levels (plus starter).
 * Completing level N unlocks that level's reward for all later play.
 */
export function plantIdsFromCompletedLevels(completedLevelNumbers: Iterable<number>): string[] {
  const unlocked = new Set<string>(STARTER_PLANT_IDS);
  for (const n of completedLevelNumbers) {
    const reward = LEVEL_CONFIGS[n]?.rewardPlantId;
    if (reward) unlocked.add(reward);
  }
  // Stable catalog order for UI
  return SEED_PLANT_CATALOG.map((p) => p.plantId).filter((id) => unlocked.has(id));
}

/** Map plantId (seed catalog) → engine plantType. */
export function plantIdToType(plantId: string): string {
  const byId = SEED_PLANT_CATALOG.find((p) => p.plantId === plantId);
  if (byId) return byId.plantType;
  const upper = plantId.toUpperCase().replace(/-/g, "_");
  if (SEED_PLANT_BY_TYPE.has(upper)) return upper;
  return upper;
}

export function plantTypeToId(plantType: string): string {
  const entry = SEED_PLANT_BY_TYPE.get(plantType);
  if (entry) return entry.plantId;
  return plantType.toLowerCase().replace(/_/g, "-");
}
