// GET /api/auth/google/callback — exchange code for user info, create/find user, issue session
import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashSessionToken } from "@/lib/auth";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  id_token?: string;
}

interface GoogleUserInfo {
  sub: string;       // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_not_configured`);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=missing_code`);
  }

  // Verify CSRF state
  const storedState = request.cookies.get("google_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_state`);
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  // Exchange authorization code for tokens
  let tokenData: GoogleTokenResponse;
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }
    tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  } catch {
    return NextResponse.redirect(`${appUrl}/login?error=token_exchange_failed`);
  }

  // Fetch Google user info
  let userInfo: GoogleUserInfo;
  try {
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) {
      throw new Error(`Userinfo failed: ${userRes.status}`);
    }
    userInfo = (await userRes.json()) as GoogleUserInfo;
  } catch {
    return NextResponse.redirect(`${appUrl}/login?error=userinfo_failed`);
  }

  if (!userInfo.email_verified) {
    return NextResponse.redirect(`${appUrl}/login?error=email_not_verified`);
  }

  // Upsert user and create session — wrapped so DB errors redirect gracefully
  try {
    let user = await prisma.user.findUnique({ where: { googleId: userInfo.sub } });

    if (!user) {
      user = await prisma.user.findUnique({ where: { email: userInfo.email } });
      if (user) {
        // Existing email-only account — link Google
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: userInfo.sub,
            avatarUrl: userInfo.picture ?? user.avatarUrl,
          },
        });
      } else {
        // Brand new user
        user = await prisma.user.create({
          data: {
            email: userInfo.email,
            googleId: userInfo.sub,
            displayName: userInfo.name,
            avatarUrl: userInfo.picture,
          },
        });
      }
    } else {
      // Update avatar/name in case they changed
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: userInfo.picture, displayName: userInfo.name },
      });
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: request.headers.get("user-agent") ?? undefined,
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      },
    });

    const redirectUrl = new URL("/", appUrl);
    redirectUrl.searchParams.set("auth_token", token);
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (err) {
    console.error("[google/callback] DB error:", err);
    return NextResponse.redirect(`${appUrl}/login?error=internal_error`);
  }
}
