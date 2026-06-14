// ---------------------------------------------------------------------------
// GET /api/game/level-config?levelNumber=N
// Returns level environment config + user's allowed loadout for that level.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { PLANT_DEFINITIONS } from "@/engine/entities/plant-defs";

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
    const [level, userPackets] = await Promise.all([
      prisma.level.findUnique({ where: { levelNumber } }),
      prisma.userSeedPacket.findMany({
        where: { userId: auth.session.userId },
        select: { plantId: true },
      }),
    ]);

    if (!level) {
      return NextResponse.json({ error: "Level not found" }, { status: 404 });
    }

    const unlockedPlantIds = new Set(userPackets.map((p) => p.plantId));

    // Start with user's unlocked plants (plantId == plantType for engine plants)
    let availablePlants = [...unlockedPlantIds];

    // Filter by allowedPlantIds if the level restricts to a specific set
    if (level.allowedPlantIds.length > 0) {
      const allowed = new Set(level.allowedPlantIds);
      availablePlants = availablePlants.filter((id) => allowed.has(id));
    }

    // Remove explicitly banned plants
    if (level.bannedPlantIds.length > 0) {
      const banned = new Set(level.bannedPlantIds);
      availablePlants = availablePlants.filter((id) => !banned.has(id));
    }

    // Truncate to seedSlots
    const slots = availablePlants.slice(0, level.seedSlots);

    // Build SeedPacketSlot-compatible entries using engine plant definitions
    const loadout = slots.map((plantId, index) => {
      const def = PLANT_DEFINITIONS[plantId.toUpperCase()] ?? PLANT_DEFINITIONS[plantId];
      const rechargeMs = def ? Math.round(def.rechargeTime * 1000) : 7_500;
      return {
        plantType: def?.plantType ?? plantId.toUpperCase(),
        plantId,
        sunCost: def?.sunCost ?? 100,
        cooldownRemainingMs: 0,
        cooldownTotalMs: rechargeMs,
        isSelected: false,
        slotIndex: index,
      };
    });

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
        seedSlots: level.seedSlots,
        rewardPlantId: level.rewardPlantId,
        waveConfig: level.waveConfig,
      },
      loadout,
    });
  } catch (err) {
    console.error("[GET /api/game/level-config]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
