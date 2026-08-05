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

    const availablePlants = availablePlantIds.map((id, index) => buildSlot(id, index));
    const seedSlots = Math.max(1, level.seedSlots);

    // Pre-select when the player has fewer plants than slots (early tutorial levels)
    const preselected =
      availablePlants.length <= seedSlots
        ? availablePlants.map((slot, index) => ({ ...slot, slotIndex: index }))
        : [];

    return NextResponse.json({
      level: {
        levelNumber: level.levelNumber,
        name: level.name,
        environmentType: level.environmentType,
        gridRows: level.gridRows,
        gridCols: level.gridCols,
        waterLaneIndices: level.waterLaneIndices,
        gravesEnabled: level.gravesEnabled,
        fogEnabled: level.fogEnabled,
        slopeEnabled: level.slopeEnabled,
        conveyorBelt: level.conveyorBelt,
        skyDropSun: level.skyDropSun,
        startingSun: level.startingSun,
        seedSlots,
        rewardPlantId: level.rewardPlantId,
        briefingText: level.briefingText,
        waveConfig: level.waveConfig,
      },
      availablePlants,
      seedSlots,
      /** @deprecated use availablePlants + chooser; kept for older clients */
      loadout: preselected.length > 0 ? preselected : availablePlants.slice(0, seedSlots),
    });
  } catch (err) {
    console.error("[GET /api/game/level-config]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
