"use client";

import { useState } from "react";
import { useGameStore } from "@/store/game-store";
import { WaveProgressBar } from "./WaveProgressBar";

function persistenceIcon(label: string): string {
  if (label === "Cloud" || label === "Loaded") return "☁️ ";
  if (label === "Saving") return "⏳ ";
  if (label === "Saved") return "✓ ";
  if (label === "Local") return "💾 ";
  if (label === "Syncing") return "↻ ";
  if (label === "Save failed") return "⚠ ";
  if (label === "Pick seeds") return "🌱 ";
  return "";
}

interface GameHUDProps {
  onPauseRequest?: () => Promise<void> | void;
  onResumeRequest?: () => Promise<void> | void;
  persistenceLabel?: string;
  showWaveBar?: boolean;
  hideSun?: boolean;
}

export function GameHUD({
  onPauseRequest,
  onResumeRequest,
  persistenceLabel,
  showWaveBar = true,
  hideSun = false,
}: GameHUDProps = {}) {
  const currentSun = useGameStore((s) => s.currentSun);
  const score = useGameStore((s) => s.score);
  const status = useGameStore((s) => s.status);
  const hideSunFromRules = useGameStore((s) => s.levelRules.hideSunHud);
  const [isSyncing, setIsSyncing] = useState(false);
  const showSun = !hideSun && !hideSunFromRules;

  const isPaused = status === "paused";
  const isPlaying = status === "playing";

  async function handlePauseResume() {
    if (isSyncing) return;
    const store = useGameStore.getState();
    setIsSyncing(true);
    try {
      if (isPaused) {
        if (onResumeRequest) await onResumeRequest();
        else store.resumeGame();
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
    <header className="pvz-hud">
      {showSun && (
        <div className="pvz-sun-counter" title="Sun">
          <div className="pvz-sun-counter__icon" aria-hidden>
            ☀
          </div>
          <span className="pvz-sun-counter__value">{currentSun}</span>
        </div>
      )}

      {showWaveBar && (isPlaying || isPaused || status === "victory" || status === "game-over") ? (
        <WaveProgressBar />
      ) : (
        <div className="pvz-wave-bar" style={{ justifyContent: "center" }}>
          <span style={{ color: "#c8b898", fontSize: "0.8rem", fontWeight: 700, opacity: 0.85 }}>
            {status === "idle" ? "Choose your seeds" : "Get ready…"}
          </span>
        </div>
      )}

      <div className="pvz-hud__score">
        Score <strong>{score.toLocaleString()}</strong>
      </div>

      {persistenceLabel && (
        <span className="pvz-hud__meta">
          {persistenceIcon(persistenceLabel)}
          {persistenceLabel}
        </span>
      )}

      {isPaused && <span className="pvz-badge pvz-badge--gold">Paused</span>}

      {(isPlaying || isPaused) && (
        <button
          type="button"
          className={isPaused ? "pvz-btn pvz-btn--primary pvz-btn--sm" : "pvz-btn pvz-btn--secondary pvz-btn--sm"}
          onClick={handlePauseResume}
          disabled={isSyncing}
          style={
            isPaused
              ? undefined
              : {
                  background: "rgba(20, 14, 8, 0.55)",
                  borderColor: "rgba(200, 160, 100, 0.35)",
                  color: "#e8d8b8",
                }
          }
        >
          {isSyncing ? "Syncing…" : isPaused ? "▶ Resume" : "⏸ Pause"}
        </button>
      )}
    </header>
  );
}
