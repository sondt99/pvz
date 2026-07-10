// POST /api/auth/logout — revoke current session
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: true }); // already logged out
  }

  // Revoke by the session id authenticateRequest already resolved — works whether
  // the request authenticated via the Authorization header or the session cookie.
  // updateMany (not update) so this stays a no-op if the row is already gone,
  // matching the old handler's tolerance for revoking an already-vanished session.
  await prisma.session.updateMany({
    where: { id: auth.session.sessionId },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
