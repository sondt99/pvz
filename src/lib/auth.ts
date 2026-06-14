import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "pvz_session";

export interface AuthenticatedSession {
  sessionId: string;
  userId: string;
}

export type AuthResult =
  | { ok: true; session: AuthenticatedSession }
  | { ok: false; status: 401; error: string };

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const token = getSessionToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 401, error: "Invalid or expired session" };
  }

  return {
    ok: true,
    session: {
      sessionId: session.id,
      userId: session.userId,
    },
  };
}

function getSessionToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const bearerPrefix = "Bearer ";
  if (authorization?.startsWith(bearerPrefix)) {
    const token = authorization.slice(bearerPrefix.length).trim();
    return token.length > 0 ? token : null;
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) continue;

    const name = cookie.slice(0, separatorIndex);
    if (name !== SESSION_COOKIE_NAME) continue;

    const value = cookie.slice(separatorIndex + 1);
    return value ? decodeURIComponent(value) : null;
  }

  return null;
}
