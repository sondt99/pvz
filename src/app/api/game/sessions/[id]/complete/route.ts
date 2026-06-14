// ---------------------------------------------------------------------------
// POST /api/game/sessions/:id/complete
// Marks a session as COMPLETED, updates UserLevel progress, and unlocks
// the level reward plant in UserSeedPacket when applicable.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

interface CompleteSessionBody {
  score: number;
  totalZombiesKilled: number;
  waveNumber: number;
  gameTimeMs: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: CompleteSessionBody;
  try {
    body = (await request.json()) as CompleteSessionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { score, totalZombiesKilled, waveNumber, gameTimeMs } = body;

  try {
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: { level: { select: { rewardPlantId: true, levelNumber: true } } },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.userId !== auth.session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.status === "COMPLETED" || session.status === "ABANDONED") {
      return NextResponse.json({ ok: true, alreadyCompleted: true });
    }

    const now = new Date();

    // Mark session complete
    await prisma.gameSession.update({
      where: { id },
      data: {
        status: "COMPLETED",
        score,
        totalZombiesKilled,
        waveNumber,
        gameTimeMs,
        endedAt: now,
        lastSavedAt: now,
      },
    });

    let rewardUnlocked = false;

    if (session.levelNumber !== null) {
      const levelNumber = session.levelNumber;
      const userId = auth.session.userId;

      // Update or create UserLevel record
      const existingUL = await prisma.userLevel.findUnique({
        where: { userId_levelNumber: { userId, levelNumber } },
      });

      if (existingUL) {
        await prisma.userLevel.update({
          where: { userId_levelNumber: { userId, levelNumber } },
          data: {
            status: "COMPLETED",
            attempts: { increment: 1 },
            bestScore: Math.max(existingUL.bestScore, score),
            bestTimeMs:
              existingUL.bestTimeMs === null
                ? gameTimeMs
                : Math.min(existingUL.bestTimeMs, gameTimeMs),
            highestWave: Math.max(existingUL.highestWave, waveNumber),
            lastPlayedAt: now,
            completedAt: existingUL.completedAt ?? now,
          },
        });
      } else {
        await prisma.userLevel.create({
          data: {
            userId,
            levelNumber,
            status: "COMPLETED",
            attempts: 1,
            bestScore: score,
            bestTimeMs: gameTimeMs,
            highestWave: waveNumber,
            unlockedAt: now,
            lastPlayedAt: now,
            completedAt: now,
          },
        });
      }

      // Unlock reward plant if the level has one
      const rewardPlantId = session.level?.rewardPlantId;
      if (rewardPlantId) {
        await prisma.userSeedPacket.upsert({
          where: { userId_plantId: { userId, plantId: rewardPlantId } },
          create: {
            userId,
            plantId: rewardPlantId,
            unlockSource: `level:${levelNumber}`,
          },
          update: {}, // already unlocked — no-op
        });
        rewardUnlocked = true;
      }
    }

    return NextResponse.json({ ok: true, rewardUnlocked });
  } catch (err) {
    console.error("[POST /api/game/sessions/:id/complete]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
