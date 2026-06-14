"use client";

import { useState } from "react";
import { useGameStore } from "@/store/game-store";

function persistenceIcon(label: string): string {
  if (label === "Cloud" || label === "Loaded") return "☁️ ";
  if (label === "Saving") return "⏳ ";
  if (label === "Saved") return "✓ ";
  if (label === "Local") return "💾 ";
  if (label === "Syncing") return "↻ ";
  if (label === "Save failed") return "⚠ ";
  return "";
}

interface GameHUDProps {
  onPauseRequest?: () => Promise<void> | void;
  onResumeRequest?: () => Promise<void> | void;
  persistenceLabel?: string;
}

export function GameHUD({
  onPauseRequest,
  onResumeRequest,
  persistenceLabel,
}: GameHUDProps = {}) {
  const currentSun = useGameStore((s) => s.currentSun);
  const waveNumber = useGameStore((s) => s.waveNumber);
  const score = useGameStore((s) => s.score);
  const status = useGameStore((s) => s.status);
  const [isSyncing, setIsSyncing] = useState(false);

  const isPaused = status === "paused";
  const isPlaying = status === "playing";

  async function handlePauseResume() {
    if (isSyncing) return;
    const store = useGameStore.getState();
    setIsSyncing(true);
    try {
      if (isPaused) {
        if (onResumeRequest) {
          await onResumeRequest();
        } else {
          store.resumeGame();
        }
      } else if (onPauseRequest) {
        await onPauseRequest();
      } else {
        store.pauseGame();
      }
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 24,
        padding: "8px 16px",
        background: "linear-gradient(to bottom, #0d2205, #1a3a0a)",
        borderBottom: "3px solid #2a5a0a",
        fontFamily: "sans-serif",
        userSelect: "none",
      }}
    >
      {/* Sun counter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "#2a5a0a",
          borderRadius: 8,
          padding: "4px 12px",
          border: "2px solid #ffd700",
          minWidth: 80,
        }}
      >
        <span style={{ fontSize: 20 }}>☀️</span>
        <span
          style={{
            color: "#ffd700",
            fontWeight: "bold",
            fontSize: 20,
            minWidth: 40,
            textAlign: "right",
          }}
        >
          {currentSun}
        </span>
      </div>

      {/* Wave number */}
      <div style={{ color: "#c0e8a0", fontSize: 14 }}>
        {waveNumber === 0 ? (
          <span style={{ opacity: 0.6 }}>Ready</span>
        ) : (
          <>
            <span style={{ opacity: 0.7 }}>Wave </span>
            <span style={{ fontWeight: "bold", fontSize: 16, color: "#e0ffe0" }}>
              {waveNumber}
            </span>
          </>
        )}
      </div>

      {/* Score */}
      <div style={{ color: "#c0e8a0", fontSize: 14 }}>
        <span style={{ opacity: 0.7 }}>Score </span>
        <span style={{ fontWeight: "bold", fontSize: 16, color: "#e0ffe0" }}>
          {score.toLocaleString()}
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Status badge */}
      {persistenceLabel && (
        <span
          style={{
            color: "#d7f5b6",
            fontSize: 12,
            fontWeight: 700,
            opacity: 0.86,
          }}
        >
          {persistenceIcon(persistenceLabel)}{persistenceLabel}
        </span>
      )}

      {isPaused && (
        <span
          style={{
            background: "#ff8c00",
            color: "#fff",
            borderRadius: 6,
            padding: "2px 10px",
            fontWeight: "bold",
            fontSize: 13,
            letterSpacing: 1,
          }}
        >
          PAUSED
        </span>
      )}

      {/* Pause / Resume button */}
      {(isPlaying || isPaused) && (
        <button
          onClick={handlePauseResume}
          disabled={isSyncing}
          style={{
            background: isPaused ? "#2a7a2a" : "rgba(20, 20, 20, 0.5)",
            color: "#e0ffe0",
            border: isPaused ? "2px solid #4aaa4a" : "2px solid rgba(255,255,255,0.2)",
            borderRadius: 8,
            padding: "6px 16px",
            fontWeight: "bold",
            fontSize: 14,
            cursor: isSyncing ? "wait" : "pointer",
            letterSpacing: 0.5,
            opacity: isSyncing ? 0.72 : 1,
          }}
        >
          {isSyncing ? "Syncing..." : isPaused ? "▶ Resume" : "⏸ Pause"}
        </button>
      )}
    </div>
  );
}
