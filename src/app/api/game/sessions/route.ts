// ---------------------------------------------------------------------------
// POST /api/game/sessions   — create a new game session
// GET  /api/game/sessions?userId=xxx  — list active/paused sessions for a user
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EnvironmentType } from "@/engine/types";

// ---------------------------------------------------------------------------
// POST — create session
// ---------------------------------------------------------------------------

interface CreateSessionBody {
  userId: string;
  levelNumber?: number;
  environmentType: string;
  loadout: string[];
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, levelNumber, environmentType, loadout } = body as CreateSessionBody;

  if (!userId || !environmentType || !Array.isArray(loadout)) {
    return NextResponse.json(
      { error: "Missing required fields: userId, environmentType, loadout" },
      { status: 400 }
    );
  }

  try {
    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate level exists if levelNumber provided
    if (levelNumber !== undefined) {
      const level = await prisma.level.findUnique({ where: { levelNumber } });
      if (!level) {
        return NextResponse.json({ error: "Level not found" }, { status: 404 });
      }
    }

    // Determine environment defaults based on type
    const envType = environmentType as EnvironmentType;
    const isWaterEnvironment = envType === "POOL" || envType === "FOG";
    const isNightLike = envType === "NIGHT" || envType === "FOG";
    const waterLaneIndices = isWaterEnvironment ? [2, 3] : [];
    const fogEnabled = envType === "FOG";
    const slopeEnabled = envType === "ROOF";
    const gravesEnabled = envType === "NIGHT";
    const gridRows = isWaterEnvironment ? 6 : 5;
    const skyDropSun = !isNightLike;

    const session = await prisma.gameSession.create({
      data: {
        userId,
        levelNumber: levelNumber ?? null,
        environmentType: envType,
        waterLaneIndices,
        fogEnabled,
        slopeEnabled,
        gravesEnabled,
        skyDropSun,
        gridRows,
        gridCols: 9,
        startingSun: 50,
        environmentConfig: {
          timeOfDay: isNightLike ? "night" : "day",
          hasPool: isWaterEnvironment,
          hasFog: fogEnabled,
          hasRoofSlope: slopeEnabled,
          skyDropSun,
          waterLaneIndices,
        },
        loadoutSnapshot: loadout,
        seedCooldowns: {},
        status: "ACTIVE",
      },
    });

    return NextResponse.json(
      { sessionId: session.id, createdAt: session.startedAt.toISOString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/game/sessions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET — list sessions for a user
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId query parameter" }, { status: 400 });
  }

  try {
    const sessions = await prisma.gameSession.findMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "PAUSED"] },
      },
      select: {
        id: true,
        status: true,
        score: true,
        waveNumber: true,
        lastSavedAt: true,
        levelNumber: true,
      },
      orderBy: { lastSavedAt: "desc" },
    });

    return NextResponse.json(
      sessions.map((s) => ({
        id: s.id,
        status: s.status,
        score: s.score,
        waveNumber: s.waveNumber,
        lastSavedAt: s.lastSavedAt.toISOString(),
        levelNumber: s.levelNumber,
      }))
    );
  } catch (err) {
    console.error("[GET /api/game/sessions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
