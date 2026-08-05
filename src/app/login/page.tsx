"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getCurrentUser } from "@/lib/game-session-client";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: "Google login is not configured on this server.",
  token_exchange_failed: "Could not complete Google sign-in. Please try again.",
  userinfo_failed: "Could not retrieve your Google account info. Please try again.",
  email_not_verified: "Your Google email is not verified. Please verify it and try again.",
  invalid_state: "Security check failed. Please try again.",
  missing_code: "Google sign-in was cancelled or failed. Please try again.",
  internal_error: "A server error occurred. Please try again.",
};

function LoginContent() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("error");
  const errorMsg = errorKey
    ? (ERROR_MESSAGES[errorKey] ?? "An error occurred. Please try again.")
    : null;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) window.location.replace("/");
    });
  }, []);

  const handleGoogleLogin = () => {
    setLoading(true);
    window.location.href = "/api/auth/google";
  };

  return (
    <main
      className="pvz-page pvz-page--lawn"
      style={{ display: "grid", placeItems: "center", padding: "1.25rem" }}
    >
      <div className="pvz-panel pvz-auth-card" style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            display: "grid",
            placeItems: "center",
            fontSize: "2rem",
            background: "linear-gradient(145deg, #2a5c22, #1a3a18)",
            border: "2px solid rgba(107, 207, 69, 0.45)",
            boxShadow: "0 8px 24px rgba(40, 120, 40, 0.25)",
          }}
        >
          🌱
        </div>

        <div>
          <h1 className="pvz-title pvz-title--md" style={{ marginBottom: 6 }}>
            Plants vs. Zombies
          </h1>
          <p className="pvz-subtitle" style={{ marginBottom: 8 }}>
            Web Adventure
          </p>
          <p className="pvz-muted" style={{ fontSize: "0.88rem", fontWeight: 600, maxWidth: 280, margin: "0 auto" }}>
            Sign in to save progress, unlock plants, and continue your campaign.
          </p>
        </div>

        {errorMsg && <div className="pvz-alert pvz-alert--error">{errorMsg}</div>}

        <button
          type="button"
          className="pvz-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.9rem 1.25rem",
            background: loading ? "#1f2937" : "#fff",
            color: loading ? "#9ca3af" : "#1f2937",
            border: "2px solid rgba(255,255,255,0.2)",
            borderRadius: 12,
            boxShadow: loading ? "none" : "0 4px 0 #c0c0c0, 0 8px 20px rgba(0,0,0,0.25)",
            fontSize: "0.95rem",
          }}
        >
          {loading ? (
            <>
              <span
                className="pvz-spinner"
                style={{ width: 18, height: 18, borderWidth: 2 }}
              />
              Signing in…
            </>
          ) : (
            <>
              <GoogleIcon />
              Sign in with Google
            </>
          )}
        </button>

        <p style={{ color: "#4b5563", fontSize: "0.72rem", fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
          Progress is saved automatically once you sign in.
          <br />
          Free play is available after login.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }} aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="pvz-page pvz-page--lawn" style={{ display: "grid", placeItems: "center" }}>
          <div className="pvz-spinner" />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
