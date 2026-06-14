"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredSessionToken } from "@/lib/game-session-client";

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

const WORLD_META: Record<number, { label: string; subtitle: string; bg: string; accent: string; icon: string }> = {
  1: { label: "Day",   subtitle: "World 1 · The Front Yard",      bg: "#1a2e1a", accent: "#4ade80", icon: "☀️" },
  2: { label: "Night", subtitle: "World 2 · Moonlit Mayhem",      bg: "#1a1a2e", accent: "#818cf8", icon: "🌙" },
  3: { label: "Pool",  subtitle: "World 3 · The Backyard Pool",   bg: "#0f2a30", accent: "#22d3ee", icon: "🏊" },
  4: { label: "Fog",   subtitle: "World 4 · Foggy Night Pool",    bg: "#1a1f25", accent: "#64748b", icon: "🌫️" },
  5: { label: "Roof",  subtitle: "World 5 · Rooftop Showdown",    bg: "#2a1f1a", accent: "#fb923c", icon: "🏠" },
};

function StarRow({ stars }: { stars: number }) {
  return (
    <span style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
      {[1, 2, 3].map((n) => (
        <span key={n} style={{ color: n <= stars ? "#fbbf24" : "#374151" }}>★</span>
      ))}
    </span>
  );
}

function LevelButton({ level, accent }: { level: LevelEntry; accent: string }) {
  const locked = level.status === "LOCKED";
  const completed = level.status === "COMPLETED";

  const style: React.CSSProperties = {
    position: "relative",
    width: "76px",
    height: "76px",
    borderRadius: "50%",
    border: `3px solid ${locked ? "#374151" : completed ? "#fbbf24" : accent}`,
    background: locked
      ? "#111827"
      : completed
      ? "linear-gradient(135deg, #1f2937 0%, #374151 100%)"
      : `linear-gradient(135deg, #0d1117 0%, #1c2432 100%)`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: locked ? "not-allowed" : "pointer",
    opacity: locked ? 0.45 : 1,
    textDecoration: "none",
    color: locked ? "#4b5563" : "#e2e8f0",
    boxShadow: locked ? "none" : `0 0 12px ${accent}55`,
    transition: "transform 0.15s, box-shadow 0.15s",
    gap: "2px",
  };

  const inner = (
    <>
      <span style={{ fontSize: "0.65rem", color: locked ? "#4b5563" : accent, fontWeight: 700 }}>
        {level.name}
      </span>
      {locked ? (
        <span style={{ fontSize: "1rem" }}>🔒</span>
      ) : completed ? (
        <span style={{ fontSize: "1rem" }}>✅</span>
      ) : (
        <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>{level.stageNumber}</span>
      )}
      {completed && <StarRow stars={level.stars} />}
    </>
  );

  if (locked) {
    return <div style={style}>{inner}</div>;
  }

  return (
    <Link
      href={`/game?level=${level.levelNumber}`}
      style={style}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${accent}aa`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${accent}55`;
      }}
    >
      {inner}
    </Link>
  );
}

function WorldSection({ worldNumber, levels }: { worldNumber: number; levels: LevelEntry[] }) {
  const meta = WORLD_META[worldNumber];
  const completed = levels.filter((l) => l.status === "COMPLETED").length;

  return (
    <section
      style={{
        background: meta.bg,
        border: `1px solid ${meta.accent}33`,
        borderRadius: "1rem",
        padding: "1.5rem 2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: meta.accent, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>{meta.icon}</span>
            <span>World {worldNumber}: {meta.label}</span>
          </h2>
          <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.15rem" }}>{meta.subtitle}</p>
        </div>
        <div style={{ fontSize: "0.8rem", color: "#6b7280", textAlign: "right" }}>
          <span style={{ color: completed === 10 ? "#fbbf24" : meta.accent, fontWeight: 600 }}>{completed}</span>
          <span style={{ color: "#374151" }}>/10</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
        }}
      >
        {levels.map((level) => (
          <LevelButton key={level.levelNumber} level={level} accent={meta.accent} />
        ))}
      </div>

      {completed === 10 && (
        <div style={{ fontSize: "0.75rem", color: "#fbbf24", textAlign: "center", fontWeight: 600 }}>
          ★ World Complete! ★
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const [levels, setLevels] = useState<LevelEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredSessionToken();
    const headers: HeadersInit = token ? { authorization: `Bearer ${token}` } : {};
    fetch("/api/game/levels", { credentials: "include", headers })
      .then((r) => r.json())
      .then((data: { levels: LevelEntry[] }) => setLevels(data.levels ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byWorld: Record<number, LevelEntry[]> = {};
  for (const l of levels) {
    (byWorld[l.worldNumber] ??= []).push(l);
  }
  const totalCompleted = levels.filter((l) => l.status === "COMPLETED").length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, #0f2027 0%, #1a1a2e 60%, #0d0d0d 100%)",
        padding: "2rem 1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0",
      }}
    >
      {/* Header */}
      <header style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 900,
            letterSpacing: "0.04em",
            background: "linear-gradient(135deg, #4ade80 0%, #22d3ee 50%, #818cf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "0.5rem",
          }}
        >
          Plants vs. Zombies
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
          Adventure Mode · 5 Worlds · 50 Levels
        </p>
        {levels.length > 0 && (
          <p style={{ color: "#4b5563", fontSize: "0.8rem", marginTop: "0.25rem" }}>
            Progress:{" "}
            <span style={{ color: "#4ade80", fontWeight: 600 }}>
              {totalCompleted}
            </span>
            /50 levels completed
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.25rem", flexWrap: "wrap" }}>
          <Link
            href="/game"
            style={{
              background: "linear-gradient(135deg, #16a34a, #15803d)",
              color: "#fff",
              padding: "0.65rem 1.75rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              fontSize: "0.95rem",
              fontWeight: 700,
              border: "1px solid #22c55e44",
              boxShadow: "0 0 12px #16a34a55",
            }}
          >
            🎮 Free Play
          </Link>
        </div>
      </header>

      {/* World sections */}
      {loading ? (
        <div style={{ color: "#6b7280", fontSize: "1rem", marginTop: "3rem" }}>Loading levels…</div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            width: "100%",
            maxWidth: "900px",
          }}
        >
          {[1, 2, 3, 4, 5].map((w) => (
            <WorldSection key={w} worldNumber={w} levels={byWorld[w] ?? []} />
          ))}
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: "3rem", color: "#374151", fontSize: "0.75rem", textAlign: "center" }}>
        Web clone · Built with Next.js, Neon Postgres & Zustand
      </footer>
    </main>
  );
}
