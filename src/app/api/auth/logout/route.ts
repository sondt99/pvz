// POST /api/auth/logout — revoke current session
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hashSessionToken } from "@/lib/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: true }); // already logged out
  }

  // Extract token from header to revoke it
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : null;

  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashSessionToken(token) },
      data: { revokedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
