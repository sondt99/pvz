"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: "Google login is not configured on this server.",
  token_exchange_failed: "Could not complete Google sign-in. Please try again.",
  userinfo_failed: "Could not retrieve your Google account info. Please try again.",
  email_not_verified: "Your Google email is not verified. Please verify it and try again.",
  invalid_state: "Security check failed. Please try again.",
  missing_code: "Google sign-in was cancelled or failed. Please try again.",
};

function LoginContent() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("error");
  const errorMsg = errorKey ? (ERROR_MESSAGES[errorKey] ?? "An error occurred. Please try again.") : null;
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    setLoading(true);
    window.location.href = "/api/auth/google";
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 20% 0%, #0a1f0a 0%, #0d0d1a 40%, #050505 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          background: "#0d1117",
          border: "1px solid #22c55e33",
          borderRadius: "1rem",
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: 380,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
          boxShadow: "0 0 40px #22c55e11",
        }}
      >
        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "1.8rem",
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "linear-gradient(135deg, #86efac 0%, #4ade80 30%, #22d3ee 70%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: "0 0 0.25rem",
            }}
          >
            Plants vs. Zombies
          </h1>
          <p style={{ color: "#4b5563", fontSize: "0.8rem", margin: 0, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Sign in to save your progress
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div
            style={{
              background: "#450a0a",
              border: "1px solid #dc262666",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              color: "#fca5a5",
              fontSize: "0.8rem",
              textAlign: "center",
              width: "100%",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Google sign-in button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            width: "100%",
            padding: "0.85rem 1.5rem",
            background: loading ? "#1f2937" : "#fff",
            color: loading ? "#6b7280" : "#1f2937",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s, transform 0.1s",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          {loading ? (
            <>
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: "2px solid #374151",
                  borderTop: "2px solid #9ca3af",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  flexShrink: 0,
                }}
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

        <p style={{ color: "#374151", fontSize: "0.72rem", textAlign: "center", margin: 0 }}>
          Your game progress is saved automatically once you sign in.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
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
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
