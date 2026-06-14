// ---------------------------------------------------------------------------
// POST /api/game/sessions   — create a new game session
// GET  /api/game/sessions   — list active/paused sessions for authenticated user
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EnvironmentType } from "@/engine/types";
import { authenticateRequest } from "@/lib/auth";

// ---------------------------------------------------------------------------
// POST — create session
// ---------------------------------------------------------------------------

interface CreateSessionBody {
  levelNumber?: number;
  environmentType: string;
  loadout: string[];
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { levelNumber, environmentType, loadout } = body as CreateSessionBody;

  if (!environmentType || !Array.isArray(loadout)) {
    return NextResponse.json(
      { error: "Missing required fields: environmentType, loadout" },
      { status: 400 }
    );
  }

  try {
    // Validate level exists if levelNumber provided
    let level: Awaited<ReturnType<typeof prisma.level.findUnique>> = null;
    if (levelNumber !== undefined) {
      level = await prisma.level.findUnique({ where: { levelNumber } });
      if (!level) {
        return NextResponse.json({ error: "Level not found" }, { status: 404 });
      }
    }

    // Determine environment defaults based on type
    const envType = (level?.environmentType ?? environmentType) as EnvironmentType;
    const isWaterEnvironment = envType === "POOL" || envType === "FOG";
    const isNightLike = envType === "NIGHT" || envType === "FOG";
    const waterLaneIndices = level?.waterLaneIndices ?? (isWaterEnvironment ? [2, 3] : []);
    const fogEnabled = level?.fogEnabled ?? (envType === "FOG");
    const slopeEnabled = level?.slopeEnabled ?? (envType === "ROOF");
    const gravesEnabled = level?.gravesEnabled ?? (envType === "NIGHT");
    const gridRows = level?.gridRows ?? (isWaterEnvironment ? 6 : 5);
    const gridCols = level?.gridCols ?? 9;
    const skyDropSun = level?.skyDropSun ?? !isNightLike;
    const startingSun = level?.startingSun ?? 50;
    const levelEnvironmentConfig = toPlainObject(level?.environmentConfig);
    const waveConfig = level?.waveConfig ?? [];
    const rngSeed = level
      ? `level:${level.levelNumber}:wave:${JSON.stringify(waveConfig)}`
      : `environment:${envType}:loadout:${loadout.join(",")}`;

    const session = await prisma.gameSession.create({
      data: {
        userId: auth.session.userId,
        levelNumber: levelNumber ?? null,
        environmentType: envType,
        waterLaneIndices,
        fogEnabled,
        slopeEnabled,
        gravesEnabled,
        skyDropSun,
        gridRows,
        gridCols,
        startingSun,
        rngSeed,
        environmentConfig: {
          ...levelEnvironmentConfig,
          timeOfDay: isNightLike ? "night" : "day",
          hasPool: isWaterEnvironment,
          hasFog: fogEnabled,
          hasRoofSlope: slopeEnabled,
          skyDropSun,
          waterLaneIndices,
          waveConfig,
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
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const sessions = await prisma.gameSession.findMany({
      where: {
        userId: auth.session.userId,
        status: { in: ["ACTIVE", "PAUSED"] },
      },
      select: {
        id: true,
        status: true,
        score: true,
        waveNumber: true,
        lastSavedAt: true,
        levelNumber: true,
        environmentType: true,
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
        environmentType: s.environmentType,
      }))
    );
  } catch (err) {
    console.error("[GET /api/game/sessions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function toPlainObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
