// ---------------------------------------------------------------------------
// GET /api/game/level-config?levelNumber=N
// Returns level environment config + plants available for the seed chooser.
// Progression is adventure-based (starter Peashooter + rewards from completed
// levels), not "every packet the user ever owned" — so level 1 stays tutorial.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { PLANT_DEFINITIONS } from "@/engine/entities/plant-defs";
import { plantIdsFromCompletedLevels, plantIdToType } from "@/data/plant-progression";
import { SEED_PLANT_CATALOG } from "@/data/seed-catalog";
import { LEVEL_CONFIGS, resolveLevelGridRows } from "@/data/level-configs";
import {
  parseLevelRulesFromUnknown,
  shouldRequireSeedChooser,
  shovelUnlockedFromCompleted,
  DEFAULT_LEVEL_PLAY_RULES,
  type PlayMode,
} from "@/data/level-play-modes";

function buildSlot(plantId: string, index: number) {
  const plantType = plantIdToType(plantId);
  const def = PLANT_DEFINITIONS[plantType];
  const catalog = SEED_PLANT_CATALOG.find((p) => p.plantId === plantId);
  const rechargeMs = def
    ? Math.round(def.rechargeTime * 1000)
    : Math.round((catalog?.rechargeTime ?? 7.5) * 1000);
  return {
    plantType: def?.plantType ?? plantType,
    plantId,
    displayName: catalog?.displayName ?? plantType.replace(/_/g, " "),
    sunCost: def?.sunCost ?? catalog?.sunCost ?? 100,
    cooldownRemainingMs: 0,
    cooldownTotalMs: rechargeMs,
    isSelected: false,
    slotIndex: index,
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const levelNumber = Number(url.searchParams.get("levelNumber"));
  if (!levelNumber || !Number.isInteger(levelNumber)) {
    return NextResponse.json({ error: "Missing or invalid levelNumber" }, { status: 400 });
  }

  try {
    const [level, completedRows] = await Promise.all([
      prisma.level.findUnique({ where: { levelNumber } }),
      prisma.userLevel.findMany({
        where: {
          userId: auth.session.userId,
          status: "COMPLETED",
        },
        select: { levelNumber: true },
      }),
    ]);

    if (!level) {
      return NextResponse.json({ error: "Level not found" }, { status: 404 });
    }

    const completedLevelNumbers = completedRows.map((row) => row.levelNumber);
    let availablePlantIds = plantIdsFromCompletedLevels(completedLevelNumbers);

    // Optional per-level allow / ban lists
    if (level.allowedPlantIds.length > 0) {
      const allowed = new Set(level.allowedPlantIds);
      availablePlantIds = availablePlantIds.filter((id) => allowed.has(id));
    }
    if (level.bannedPlantIds.length > 0) {
      const banned = new Set(level.bannedPlantIds);
      availablePlantIds = availablePlantIds.filter((id) => !banned.has(id));
    }

    // Ensure starter is always present for adventure levels
    if (availablePlantIds.length === 0) {
      availablePlantIds = ["peashooter"];
    }

    const codeCfg = LEVEL_CONFIGS[levelNumber];
    const fromDb = parseLevelRulesFromUnknown(level.ruleConfig);
    const playMode = (fromDb.playMode ?? codeCfg?.playMode ?? "NORMAL") as PlayMode;
    const skipSeedChooser =
      fromDb.skipSeedChooser ??
      codeCfg?.skipSeedChooser ??
      DEFAULT_LEVEL_PLAY_RULES.skipSeedChooser;
    const freePlacement =
      fromDb.freePlacement ??
      codeCfg?.freePlacement ??
      (playMode === "BOWLING" || playMode === "CONVEYOR");
    const hideSunHud =
      fromDb.hideSunHud ??
      codeCfg?.hideSunHud ??
      (playMode === "BOWLING" || playMode === "CONVEYOR");
    const conveyorBelt =
      fromDb.conveyorBelt ?? codeCfg?.conveyorBelt ?? level.conveyorBelt ?? playMode === "CONVEYOR";
    const startingSun =
      fromDb.startingSun ?? codeCfg?.startingSun ?? level.startingSun ?? 50;
    const skyDropSun =
      fromDb.skyDropSun ??
      (codeCfg?.skyDropSun === null || codeCfg?.skyDropSun === undefined
        ? level.skyDropSun
        : codeCfg.skyDropSun);
    const conveyorPlantPool =
      fromDb.conveyorPlantPool ?? codeCfg?.conveyorPlantPool ?? [];
    const conveyorIntervalMs =
      fromDb.conveyorIntervalMs ?? codeCfg?.conveyorIntervalMs ?? 3500;
    const conveyorSlotCap =
      fromDb.conveyorSlotCap ?? codeCfg?.conveyorSlotCap ?? 10;
    const bowlingNutTypes =
      fromDb.bowlingNutTypes ?? codeCfg?.bowlingNutTypes ?? ["WALL_NUT"];

    // Bowling mini-game uses nut packets, not adventure unlocks.
    let availablePlants =
      playMode === "BOWLING"
        ? bowlingNutTypes.map((plantType, index) => {
            const plantId = plantType.toLowerCase().replace(/_/g, "-");
            const def = PLANT_DEFINITIONS[plantType];
            return {
              plantType,
              plantId,
              displayName:
                plantType === "EXPLODE_O_NUT"
                  ? "Explode-o-nut"
                  : plantType.replace(/_/g, " "),
              sunCost: 0,
              cooldownRemainingMs: 0,
              cooldownTotalMs: 1_200,
              isSelected: false,
              slotIndex: index,
            };
          })
        : availablePlantIds.map((id, index) => buildSlot(id, index));

    // Conveyor: chooser skipped; available list is informational.
    if (playMode === "CONVEYOR" && conveyorPlantPool.length > 0) {
      availablePlants = conveyorPlantPool.map((plantType, index) => {
        const def = PLANT_DEFINITIONS[plantType];
        return {
          plantType,
          plantId: plantType.toLowerCase().replace(/_/g, "-"),
          displayName: plantType.replace(/_/g, " "),
          sunCost: 0,
          cooldownRemainingMs: 0,
          cooldownTotalMs: 0,
          isSelected: false,
          slotIndex: index,
        };
      });
    }

    const seedSlots = Math.max(1, level.seedSlots);
    const requireChooser = shouldRequireSeedChooser(levelNumber, {
      playMode,
      skipSeedChooser,
    });

    // Pre-select fixed loadout for early / special levels
    const preselected =
      !requireChooser || availablePlants.length <= seedSlots
        ? availablePlants.slice(0, seedSlots).map((slot, index) => ({ ...slot, slotIndex: index }))
        : [];

    // Prefer code-level lawn unlock (1/3/5) over stale DB defaults of always 5.
    const gridRows = resolveLevelGridRows(levelNumber, level.gridRows);

    return NextResponse.json({
      level: {
        levelNumber: level.levelNumber,
        name: level.name,
        environmentType: level.environmentType,
        gridRows,
        gridCols: level.gridCols,
        waterLaneIndices: level.waterLaneIndices,
        gravesEnabled: level.gravesEnabled,
        fogEnabled: level.fogEnabled,
        slopeEnabled: level.slopeEnabled,
        conveyorBelt,
        skyDropSun,
        startingSun,
        seedSlots,
        rewardPlantId: level.rewardPlantId ?? codeCfg?.rewardPlantId ?? null,
        briefingText: level.briefingText,
        waveConfig: level.waveConfig,
        playMode,
        skipSeedChooser: !requireChooser,
        freePlacement,
        hideSunHud,
        conveyorPlantPool,
        conveyorIntervalMs,
        conveyorSlotCap,
        bowlingNutTypes,
      },
      availablePlants,
      seedSlots,
      requireSeedChooser: requireChooser,
      shovelUnlocked: shovelUnlockedFromCompleted(completedLevelNumbers),
      /** @deprecated use availablePlants + chooser; kept for older clients */
      loadout: preselected.length > 0 ? preselected : availablePlants.slice(0, seedSlots),
    });
  } catch (err) {
    console.error("[GET /api/game/level-config]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
