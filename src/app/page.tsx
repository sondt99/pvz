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

const WORLD_META = {
  1: {
    label: "Day",
    desc: "Front Yard",
    icon: "☀️",
    accent: "#6bcf45",
    surface: "rgba(20, 48, 24, 0.55)",
  },
  2: {
    label: "Night",
    desc: "Night Garden",
    icon: "🌙",
    accent: "#a5b4fc",
    surface: "rgba(24, 24, 48, 0.55)",
  },
  3: {
    label: "Pool",
    desc: "Backyard Pool",
    icon: "🏊",
    accent: "#67e8f9",
    surface: "rgba(12, 40, 48, 0.55)",
  },
  4: {
    label: "Fog",
    desc: "Foggy Night",
    icon: "🌫️",
    accent: "#9ca3af",
    surface: "rgba(28, 32, 40, 0.55)",
  },
  5: {
    label: "Roof",
    desc: "Rooftop",
    icon: "🏠",
    accent: "#fdba74",
    surface: "rgba(48, 28, 12, 0.55)",
  },
} as const;

type WorldNum = keyof typeof WORLD_META;

function Stars({ count }: { count: number }) {
  return (
    <span style={{ fontSize: "0.7rem", lineHeight: 1, letterSpacing: 1 }}>
      {"★★★".split("").map((s, i) => (
        <span key={i} style={{ color: i < count ? "#fbbf24" : "#374151" }}>
          {s}
        </span>
      ))}
    </span>
  );
}

function LevelNode({
  level,
  accent,
}: {
  level: LevelEntry;
  accent: string;
}) {
  const locked = level.status === "LOCKED";
  const done = level.status === "COMPLETED";

  const className = [
    "pvz-level-node",
    locked ? "pvz-level-node--locked" : done ? "pvz-level-node--done" : "pvz-level-node--open",
  ].join(" ");

  const style = {
    ["--world-accent" as string]: accent,
    ["--node-border" as string]: locked ? "#1f2937" : done ? "#f0c84a" : accent,
    ["--node-hi" as string]: locked ? "#151b18" : done ? "#243018" : "#1a2a18",
    ["--node-lo" as string]: locked ? "#0a0e0c" : done ? "#121a0e" : "#0c140e",
  } as React.CSSProperties;

  const inner = (
    <>
      <span className="pvz-level-node__label">{level.name}</span>
      {locked ? (
        <span style={{ fontSize: "1rem" }}>🔒</span>
      ) : done ? (
        <span style={{ fontSize: "0.95rem" }}>✓</span>
      ) : (
        <span className="pvz-level-node__num" style={{ color: accent }}>
          {level.stageNumber}
        </span>
      )}
      {done && <Stars count={level.stars} />}
    </>
  );

  if (locked) {
    return (
      <div className={className} style={style} title="Locked">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/game?level=${level.levelNumber}`}
      className={className}
      style={style}
      title={done ? `Replay ${level.name}` : `Play ${level.name}`}
    >
      {inner}
    </Link>
  );
}

function WorldSection({ worldNum, levels }: { worldNum: WorldNum; levels: LevelEntry[] }) {
  const meta = WORLD_META[worldNum];
  const completed = levels.filter((l) => l.status === "COMPLETED").length;
  const allDone = completed === 10;

  return (
    <section
      className="pvz-world"
      style={
        {
          ["--world-accent" as string]: meta.accent,
          background: `linear-gradient(145deg, ${meta.surface}, rgba(8, 14, 10, 0.96))`,
          borderColor: `${meta.accent}33`,
        } as React.CSSProperties
      }
    >
      <div className="pvz-world__header">
        <div className="pvz-world__title">
          <div className="pvz-world__icon" style={{ borderColor: `${meta.accent}44` }}>
            {meta.icon}
          </div>
          <div>
            <h2 className="pvz-world__name">
              World {worldNum}: {meta.label}
            </h2>
            <p className="pvz-world__desc">{meta.desc}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {allDone && <span className="pvz-badge pvz-badge--gold">★ Complete</span>}
          <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>
            <span style={{ color: allDone ? "#f0c84a" : meta.accent }}>{completed}</span>
            <span style={{ color: "#4b5563" }}>/10</span>
          </span>
        </div>
      </div>

      <div className="pvz-level-path">
        {levels.map((level, i) => (
          <span
            key={level.levelNumber}
            style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
          >
            {i > 0 && (
              <div
                className={
                  levels[i - 1].status === "COMPLETED"
                    ? "pvz-connector pvz-connector--done"
                    : "pvz-connector"
                }
                style={{ ["--world-accent" as string]: meta.accent } as React.CSSProperties}
              />
            )}
            <LevelNode level={level} accent={meta.accent} />
          </span>
        ))}
      </div>
    </section>
  );
}

function findNextLevel(levels: LevelEntry[]): LevelEntry | null {
  return levels.find((l) => l.status === "UNLOCKED") ?? null;
}

export default function HomePage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [levels, setLevels] = useState<LevelEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("auth_token");
    if (tokenFromUrl) {
      storeSessionToken(tokenFromUrl);
      window.history.replaceState({}, "", window.location.pathname);
    }
    getCurrentUser().then((user) => {
      if (!user) {
        window.location.replace("/login");
        return;
      }
      setCurrentUser(user);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const token = getStoredSessionToken();
    const headers: HeadersInit = token ? { authorization: `Bearer ${token}` } : {};
    fetch("/api/game/levels", { credentials: "include", headers })
      .then((r) => r.json())
      .then((d: { levels: LevelEntry[] }) => setLevels(d.levels ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading]);

  const byWorld: Record<number, LevelEntry[]> = {};
  for (const l of levels) {
    (byWorld[l.worldNumber] ??= []).push(l);
  }

  const totalCompleted = levels.filter((l) => l.status === "COMPLETED").length;
  const nextLevel = findNextLevel(levels);
  const progressPct = levels.length > 0 ? (totalCompleted / 50) * 100 : 0;

  return (
    <main className="pvz-page pvz-page--lawn">
      <div className="pvz-page-inner">
        {/* Auth bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            minHeight: 44,
            marginBottom: "0.75rem",
          }}
        >
          {!authLoading && currentUser && (
            <div
              className="pvz-panel--glass"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                padding: "0.4rem 0.55rem 0.4rem 0.45rem",
                borderRadius: 999,
              }}
            >
              {currentUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.avatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "2px solid rgba(107, 207, 69, 0.45)",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(145deg, #1a4d28, #0d2818)",
                    border: "2px solid rgba(107, 207, 69, 0.4)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    color: "#6bcf45",
                  }}
                >
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className="pvz-muted"
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  maxWidth: 140,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {currentUser.displayName}
              </span>
              <button
                type="button"
                className="pvz-btn pvz-btn--ghost pvz-btn--sm"
                onClick={async () => {
                  await logout();
                  setCurrentUser(null);
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Hero */}
        <header style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: "1.6rem" }}>🌱</span>
            <span className="pvz-subtitle">Adventure Mode</span>
            <span style={{ fontSize: "1.6rem" }}>🧟</span>
          </div>

          <h1 className="pvz-title pvz-title--lg" style={{ marginBottom: "0.35rem" }}>
            Plants vs. Zombies
          </h1>
          <p
            className="pvz-muted"
            style={{ fontSize: "0.95rem", maxWidth: 420, margin: "0 auto 1.35rem", fontWeight: 600 }}
          >
            Defend your lawn across five worlds. Unlock plants, survive waves, and keep your brains.
          </p>

          {!loading && levels.length > 0 && (
            <div style={{ maxWidth: 420, margin: "0 auto 1.35rem", textAlign: "left" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#6a8a68",
                  marginBottom: 6,
                }}
              >
                <span>Campaign progress</span>
                <span style={{ color: totalCompleted === 50 ? "#f0c84a" : "#6bcf45" }}>
                  {totalCompleted}/50 levels
                </span>
              </div>
              <div className="pvz-progress">
                <div className="pvz-progress__fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {nextLevel && (
              <Link href={`/game?level=${nextLevel.levelNumber}`} className="pvz-btn pvz-btn--primary pvz-btn--lg">
                ▶ Continue — {nextLevel.name}
              </Link>
            )}
            {!nextLevel && totalCompleted === 0 && (
              <Link href="/game?level=1" className="pvz-btn pvz-btn--primary pvz-btn--lg">
                ▶ Start Adventure
              </Link>
            )}
            {!nextLevel && totalCompleted > 0 && totalCompleted < 50 && (
              <Link href="/game?level=1" className="pvz-btn pvz-btn--primary pvz-btn--lg">
                ▶ Resume Path
              </Link>
            )}
            {totalCompleted === 50 && (
              <span className="pvz-badge pvz-badge--gold" style={{ fontSize: "0.85rem", padding: "0.55rem 1rem" }}>
                ★ Adventure complete!
              </span>
            )}
            <Link href="/game" className="pvz-btn pvz-btn--secondary pvz-btn--lg">
              🎮 Free Play
            </Link>
          </div>
        </header>

        {/* Worlds */}
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              marginTop: "3rem",
            }}
          >
            <div className="pvz-spinner" />
            <span className="pvz-muted" style={{ fontSize: "0.9rem", fontWeight: 700 }}>
              Loading levels…
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {([1, 2, 3, 4, 5] as WorldNum[]).map((w) => (
              <WorldSection key={w} worldNum={w} levels={byWorld[w] ?? []} />
            ))}
          </div>
        )}

        <footer
          style={{
            marginTop: "2.75rem",
            textAlign: "center",
            color: "#4b5563",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Day · Night · Pool · Fog · Roof
        </footer>
      </div>
    </main>
  );
}
