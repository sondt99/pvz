// ---------------------------------------------------------------------------
// GET /api/game/sessions/:id — load a session with deserialized state
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deserializeGameState } from "@/lib/game-deserializer";
import { authenticateRequest } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.userId !== auth.session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const currentGameTimeMs = 0; // Client will reconcile timing after load

    const runtimeState = deserializeGameState(
      {
        gameTimeMs: session.gameTimeMs,
        environmentState: session.environmentState,
        graveState: session.graveState,
        gridState: session.gridState,
        zombieState: session.zombieState,
        projectileState: session.projectileState,
        sunDropState: session.sunDropState,
        lawnMowerState: session.lawnMowerState,
        spawnQueueState: session.spawnQueueState,
        seedCooldowns: session.seedCooldowns,
        loadoutSnapshot: session.loadoutSnapshot,
        currentSun: session.currentSun,
        cumulativeSun: session.cumulativeSun,
        score: session.score,
        waveNumber: session.waveNumber,
        nextWaveTimerMs: session.nextWaveTimerMs,
        totalZombiesKilled: session.totalZombiesKilled,
        environmentType: session.environmentType,
        gridRows: session.gridRows,
        gridCols: session.gridCols,
        waterLaneIndices: session.waterLaneIndices,
        gravesEnabled: session.gravesEnabled,
        fogEnabled: session.fogEnabled,
        slopeEnabled: session.slopeEnabled,
        conveyorBelt: session.conveyorBelt,
        environmentConfig: session.environmentConfig,
        rngSeed: session.rngSeed,
      },
      currentGameTimeMs
    );

    return NextResponse.json({
      session: {
        id: session.id,
        userId: session.userId,
        levelNumber: session.levelNumber,
        status: session.status,
        startedAt: session.startedAt.toISOString(),
        lastSavedAt: session.lastSavedAt.toISOString(),
      },
      state: runtimeState,
    });
  } catch (err) {
    console.error("[GET /api/game/sessions/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
