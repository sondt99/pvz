"use client";

import { useGameStore } from "@/store/game-store";

export function GameHUD() {
  const currentSun = useGameStore((s) => s.currentSun);
  const waveNumber = useGameStore((s) => s.waveNumber);
  const score = useGameStore((s) => s.score);
  const status = useGameStore((s) => s.status);

  const isPaused = status === "paused";
  const isPlaying = status === "playing";

  function handlePauseResume() {
    const store = useGameStore.getState();
    if (isPaused) {
      store.resumeGame();
    } else {
      store.pauseGame();
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
        <span style={{ fontSize: 20 }}>☀</span>
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
        <span style={{ opacity: 0.7 }}>Wave </span>
        <span style={{ fontWeight: "bold", fontSize: 16, color: "#e0ffe0" }}>
          {waveNumber}
        </span>
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
          style={{
            background: isPaused ? "#2a7a2a" : "#5a3a0a",
            color: "#e0ffe0",
            border: "2px solid #2a5a0a",
            borderRadius: 8,
            padding: "6px 16px",
            fontWeight: "bold",
            fontSize: 14,
            cursor: "pointer",
            letterSpacing: 0.5,
          }}
        >
          {isPaused ? "▶ Resume" : "⏸ Pause"}
        </button>
      )}
    </div>
  );
}
