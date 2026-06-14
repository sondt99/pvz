import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);

  const levels = await prisma.level.findMany({
    orderBy: { levelNumber: "asc" },
    select: {
      levelNumber: true,
      name: true,
      worldNumber: true,
      stageNumber: true,
      environmentType: true,
      briefingText: true,
      rewardPlantId: true,
    },
  });

  if (!auth.ok) {
    return NextResponse.json({
      levels: levels.map((l) => ({
        ...l,
        status: l.levelNumber === 1 ? "UNLOCKED" : "LOCKED",
        bestScore: 0,
        stars: 0,
        attempts: 0,
      })),
    });
  }

  const userLevels = await prisma.userLevel.findMany({
    where: { userId: auth.session.userId },
    select: { levelNumber: true, status: true, bestScore: true, stars: true, attempts: true },
  });

  const progressMap = new Map(userLevels.map((ul) => [ul.levelNumber, ul]));

  return NextResponse.json({
    levels: levels.map((l) => {
      const progress = progressMap.get(l.levelNumber);
      return {
        ...l,
        status: progress?.status ?? (l.levelNumber === 1 ? "UNLOCKED" : "LOCKED"),
        bestScore: progress?.bestScore ?? 0,
        stars: progress?.stars ?? 0,
        attempts: progress?.attempts ?? 0,
      };
    }),
  });
}
