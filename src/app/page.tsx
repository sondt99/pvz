"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getStoredSessionToken,
  storeSessionToken,
  getCurrentUser,
  logout,
  type CurrentUser,
} from "@/lib/game-session-client";

type LevelStatus = "LOCKED" | "UNLOCKED" | "COMPLETED";

interface LevelEntry {
  levelNumber: number;
  name: string;
  worldNumber: number;
  stageNumber: number;
  environmentType: string;
  briefingText: string | null;
  rewardPlantId: string | null;
  status: LevelStatus;
  bestScore: number;
  stars: number;
  attempts: number;
}

// ---------------------------------------------------------------------------
// World metadata — environment-matched colors following PvZ aesthetic
// ---------------------------------------------------------------------------
const WORLD_META = {
  1: { label: "Day",   env: "DAY",   bg: "#0d1f0d", border: "#22c55e", accent: "#4ade80", dim: "#166534", icon: "☀️",  desc: "Front Yard" },
  2: { label: "Night", env: "NIGHT", bg: "#0d0d1f", border: "#818cf8", accent: "#a5b4fc", dim: "#3730a3", icon: "🌙", desc: "Night Garden" },
  3: { label: "Pool",  env: "POOL",  bg: "#0a1e24", border: "#22d3ee", accent: "#67e8f9", dim: "#164e63", icon: "🏊", desc: "Backyard Pool" },
  4: { label: "Fog",   env: "FOG",   bg: "#111827", border: "#6b7280", accent: "#9ca3af", dim: "#374151", icon: "🌫️", desc: "Foggy Night" },
  5: { label: "Roof",  env: "ROOF",  bg: "#1c1006", border: "#f97316", accent: "#fdba74", dim: "#9a3412", icon: "🏠", desc: "Rooftop" },
} as const;

type WorldNum = keyof typeof WORLD_META;

// ---------------------------------------------------------------------------
// Star display
// ---------------------------------------------------------------------------
function Stars({ count }: { count: number }) {
  return (
    <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>
      {"★★★".split("").map((s, i) => (
        <span key={i} style={{ color: i < count ? "#fbbf24" : "#374151" }}>{s}</span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single level button — circular, PvZ coin style
// ---------------------------------------------------------------------------
function LevelNode({ level, accent, dim }: { level: LevelEntry; accent: string; dim: string }) {
  const locked = level.status === "LOCKED";
  const done   = level.status === "COMPLETED";

  const baseStyle: React.CSSProperties = {
    position: "relative",
    width: 72,
    height: 72,
    borderRadius: "50%",
    border: `3px solid ${locked ? "#1f2937" : done ? "#fbbf24" : accent}`,
    background: locked
      ? "radial-gradient(circle, #111827 60%, #0d1117 100%)"
      : done
      ? `radial-gradient(circle, #1c2a10 60%, ${dim} 100%)`
      : `radial-gradient(circle, #0f1a0f 60%, ${dim} 100%)`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    cursor: locked ? "not-allowed" : "pointer",
    opacity: locked ? 0.4 : 1,
    textDecoration: "none",
    color: locked ? "#374151" : "#e2e8f0",
    boxShadow: locked ? "none" : done
      ? `0 0 14px #fbbf2466, inset 0 0 6px #fbbf2422`
      : `0 0 12px ${accent}44, inset 0 0 6px ${accent}11`,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    flexShrink: 0,
  };

  const inner = (
    <>
      <span style={{ fontSize: "0.6rem", fontWeight: 700, color: locked ? "#374151" : done ? "#fbbf24" : accent, letterSpacing: "0.05em" }}>
        {level.name}
      </span>
      {locked
        ? <span style={{ fontSize: "1.1rem" }}>🔒</span>
        : done
        ? <span style={{ fontSize: "1rem" }}>✅</span>
        : <span style={{ fontSize: "1.2rem", fontWeight: 800, color: accent }}>{level.stageNumber}</span>
      }
      {done && <Stars count={level.stars} />}
    </>
  );

  if (locked) {
    return <div style={baseStyle}>{inner}</div>;
  }

  return (
    <Link
      href={`/game?level=${level.levelNumber}`}
      style={baseStyle}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "scale(1.13)";
        el.style.boxShadow = done
          ? `0 0 22px #fbbf24aa, inset 0 0 8px #fbbf2444`
          : `0 0 20px ${accent}88, inset 0 0 8px ${accent}22`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "scale(1)";
        el.style.boxShadow = done
          ? `0 0 14px #fbbf2466, inset 0 0 6px #fbbf2422`
          : `0 0 12px ${accent}44, inset 0 0 6px ${accent}11`;
      }}
    >
      {inner}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Connector line between level nodes (path style)
// ---------------------------------------------------------------------------
function Connector({ done, accent }: { done: boolean; accent: string }) {
  return (
    <div style={{
      width: 18,
      height: 3,
      borderRadius: 2,
      background: done ? accent : "#1f2937",
      flexShrink: 0,
      opacity: done ? 0.7 : 0.3,
    }} />
  );
}

// ---------------------------------------------------------------------------
// World section
// ---------------------------------------------------------------------------
function WorldSection({ worldNum, levels }: { worldNum: WorldNum; levels: LevelEntry[] }) {
  const meta = WORLD_META[worldNum];
  const completed = levels.filter(l => l.status === "COMPLETED").length;
  const allDone = completed === 10;

  return (
    <section style={{
      background: meta.bg,
      border: `1px solid ${meta.border}22`,
      borderLeft: `3px solid ${meta.border}88`,
      borderRadius: "0.75rem",
      padding: "1.25rem 1.5rem",
    }}>
      {/* World header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.4rem" }}>{meta.icon}</span>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: meta.accent, margin: 0, lineHeight: 1.2 }}>
              World {worldNum}: {meta.label}
            </h2>
            <p style={{ fontSize: "0.72rem", color: "#6b7280", margin: 0 }}>{meta.desc}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {allDone && <span style={{ fontSize: "0.7rem", color: "#fbbf24", fontWeight: 700 }}>★ COMPLETE</span>}
          <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>
            <span style={{ color: allDone ? "#fbbf24" : meta.accent }}>{completed}</span>
            <span style={{ color: "#374151" }}>/10</span>
          </span>
        </div>
      </div>

      {/* Level path */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.25rem" }}>
        {levels.map((level, i) => (
          <span key={level.levelNumber} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            {i > 0 && (
              <Connector
                done={levels[i - 1].status === "COMPLETED"}
                accent={meta.accent}
              />
            )}
            <LevelNode level={level} accent={meta.accent} dim={meta.dim} />
          </span>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Find the next level to play (first UNLOCKED, not COMPLETED)
// ---------------------------------------------------------------------------
function findNextLevel(levels: LevelEntry[]): LevelEntry | null {
  return levels.find(l => l.status === "UNLOCKED") ?? null;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function HomePage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [levels, setLevels] = useState<LevelEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Pick up auth_token from URL (post-OAuth redirect), resolve user, gate on login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("auth_token");
    if (tokenFromUrl) {
      storeSessionToken(tokenFromUrl);
      window.history.replaceState({}, "", window.location.pathname);
    }
    getCurrentUser().then(user => {
      if (!user) {
        window.location.replace("/login");
        return;
      }
      setCurrentUser(user);
      setAuthLoading(false);
    });
  }, []);

  // Fetch levels after auth resolves so the right token is used
  useEffect(() => {
    if (authLoading) return;
    const token = getStoredSessionToken();
    const headers: HeadersInit = token ? { authorization: `Bearer ${token}` } : {};
    fetch("/api/game/levels", { credentials: "include", headers })
      .then(r => r.json())
      .then((d: { levels: LevelEntry[] }) => setLevels(d.levels ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading]);

  const byWorld: Record<number, LevelEntry[]> = {};
  for (const l of levels) {
    (byWorld[l.worldNumber] ??= []).push(l);
  }

  const totalCompleted = levels.filter(l => l.status === "COMPLETED").length;
  const nextLevel = findNextLevel(levels);

  return (
    <main style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 0%, #0a1f0a 0%, #0d0d1a 40%, #050505 100%)",
      padding: "1.5rem 1rem 3rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>

      {/* ---- Auth bar ---- */}
      <div style={{ width: "100%", maxWidth: 860, display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "0.5rem", minHeight: 40 }}>
        {!authLoading && currentUser && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt=""
                style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid #22c55e44", flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#14532d", border: "2px solid #22c55e44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: "#4ade80", flexShrink: 0 }}>
                {currentUser.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ color: "#9ca3af", fontSize: "0.78rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentUser.displayName}
            </span>
            <button
              onClick={async () => { await logout(); setCurrentUser(null); }}
              style={{ background: "transparent", color: "#6b7280", border: "1px solid #374151", borderRadius: "0.35rem", padding: "0.28rem 0.65rem", fontSize: "0.73rem", cursor: "pointer", fontFamily: "inherit" }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* ---- Hero header ---- */}
      <header style={{ textAlign: "center", marginBottom: "2rem", maxWidth: 700, width: "100%" }}>
        {/* Title */}
        <h1 style={{
          fontSize: "clamp(1.8rem, 5vw, 3rem)",
          fontWeight: 900,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "linear-gradient(135deg, #86efac 0%, #4ade80 30%, #22d3ee 70%, #818cf8 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: "0 0 0.2rem",
          lineHeight: 1.1,
        }}>
          Plants vs. Zombies
        </h1>
        <p style={{ color: "#4b5563", fontSize: "0.8rem", margin: "0 0 1.25rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Adventure Mode
        </p>

        {/* Progress bar */}
        {!loading && levels.length > 0 && (
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#4b5563", marginBottom: 4 }}>
              <span>Progress</span>
              <span style={{ color: totalCompleted === 50 ? "#fbbf24" : "#4ade80", fontWeight: 600 }}>
                {totalCompleted}/50 levels
              </span>
            </div>
            <div style={{ height: 6, background: "#111827", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(totalCompleted / 50) * 100}%`,
                background: "linear-gradient(90deg, #22c55e, #22d3ee)",
                borderRadius: 3,
                transition: "width 0.6s ease",
              }} />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          {nextLevel && (
            <Link
              href={`/game?level=${nextLevel.levelNumber}`}
              style={{
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                color: "#fff",
                padding: "0.65rem 1.75rem",
                borderRadius: "0.5rem",
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: 700,
                border: "1px solid #22c55e44",
                boxShadow: "0 0 16px #16a34a55",
                letterSpacing: "0.02em",
              }}
            >
              ▶ Continue — {nextLevel.name}
            </Link>
          )}
          {!nextLevel && totalCompleted === 0 && (
            <Link
              href="/game?level=1"
              style={{
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                color: "#fff",
                padding: "0.65rem 1.75rem",
                borderRadius: "0.5rem",
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: 700,
                border: "1px solid #22c55e44",
                boxShadow: "0 0 16px #16a34a55",
              }}
            >
              ▶ Start Adventure
            </Link>
          )}
          <Link
            href="/game"
            style={{
              background: "transparent",
              color: "#9ca3af",
              padding: "0.65rem 1.25rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "1px solid #374151",
              transition: "background 0.15s",
            }}
          >
            🎮 Free Play
          </Link>
        </div>
      </header>

      {/* ---- World grid ---- */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginTop: "4rem" }}>
          <div style={{
            width: 40,
            height: 40,
            border: "3px solid #1f2937",
            borderTop: "3px solid #22c55e",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ color: "#4b5563", fontSize: "0.85rem" }}>Loading levels…</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: 860 }}>
          {([1, 2, 3, 4, 5] as WorldNum[]).map(w => (
            <WorldSection key={w} worldNum={w} levels={byWorld[w] ?? []} />
          ))}
        </div>
      )}

      {/* ---- Footer ---- */}
      <footer style={{ marginTop: "2.5rem", color: "#6b7280", fontSize: "0.7rem", textAlign: "center" }}>
        Built with Next.js · Neon Postgres · Zustand · 38 plants · 32 zombies · 5 worlds
      </footer>
    </main>
  );
}
