// ---------------------------------------------------------------------------
// POST /api/game/sessions/:id/save — persist game state, mark as PAUSED
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SerializedGameState } from "@/lib/game-serializer";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = body as SerializedGameState;

  try {
    // Ensure session exists
    const existing = await prisma.gameSession.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const now = new Date();

    await prisma.gameSession.update({
      where: { id },
      data: {
        status: "PAUSED",
        lastSavedAt: now,
        gridState: JSON.stringify(payload.gridState),
        zombieState: JSON.stringify(payload.zombieState),
        seedCooldowns: JSON.stringify(payload.seedCooldowns),
        loadoutSnapshot: JSON.stringify(payload.loadoutSnapshot),
        currentSun: payload.currentSun,
        cumulativeSun: payload.cumulativeSun,
        score: payload.score,
        waveNumber: payload.waveNumber,
        nextWaveTimerMs: payload.nextWaveTimerMs,
        totalZombiesKilled: payload.totalZombiesKilled,
      },
    });

    return NextResponse.json({ ok: true, savedAt: now.toISOString() });
  } catch (err) {
    console.error("[POST /api/game/sessions/:id/save]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
