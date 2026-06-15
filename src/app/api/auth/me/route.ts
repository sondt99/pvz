// GET /api/auth/me — return current authenticated user info
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });

  return NextResponse.json({ user });
}
