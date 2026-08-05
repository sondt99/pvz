"use client";

import { useMemo } from "react";
import { useGameStore } from "@/store/game-store";
import { getFinalWaveNumber, parseWaveConfig } from "@/engine/wave-generator";

/**
 * PvZ-style wave / flag progress strip.
 * Shows filled progress toward the final wave with flag markers.
 */
export function WaveProgressBar() {
  const waveNumber = useGameStore((s) => s.waveNumber);
  const status = useGameStore((s) => s.status);
  const waveConfigRaw = useGameStore((s) => s.waveConfig);
  const zombieCount = useGameStore((s) => Object.keys(s.zombies).length);
  const queueLen = useGameStore((s) => s.zombieSpawnQueue.length);

  const { finalWave, flagWaves, progress, isHugeWave } = useMemo(() => {
    const cfg = parseWaveConfig(waveConfigRaw) ?? waveConfigRaw ?? null;
    const finalWave = Math.max(1, getFinalWaveNumber(cfg));
    const flagWaves: number[] = [];
    if (cfg && Array.isArray((cfg as { waves?: unknown }).waves)) {
      for (const w of (cfg as { waves: Array<{ waveNumber?: number; flag?: boolean; final?: boolean }> }).waves) {
        const n = w.waveNumber;
        if (typeof n === "number" && (w.flag || w.final)) flagWaves.push(n);
      }
    }
    if (flagWaves.length === 0) {
      // Default: flag every ~half and final
      if (finalWave >= 2) flagWaves.push(finalWave);
      if (finalWave >= 5) flagWaves.push(Math.ceil(finalWave / 2));
    }
    const uniqueFlags = [...new Set(flagWaves)].filter((n) => n >= 1 && n <= finalWave).sort((a, b) => a - b);

    // Progress: completed waves + partial credit while zombies remain on current wave
    let progress = 0;
    if (waveNumber <= 0) {
      progress = 0;
    } else if (waveNumber >= finalWave && zombieCount === 0 && queueLen === 0) {
      progress = 1;
    } else {
      const base = Math.max(0, waveNumber - 1) / finalWave;
      // Within current wave, nudge forward as queue drains
      const within = 1 / finalWave;
      const remainingPressure = zombieCount + queueLen;
      const partial =
        remainingPressure <= 0
          ? within * 0.85
          : within * Math.min(0.85, 0.15 + 0.7 / (1 + remainingPressure * 0.15));
      progress = Math.min(0.98, base + partial);
    }

    const isHugeWave =
      waveNumber > 0 &&
      (uniqueFlags.includes(waveNumber) || waveNumber === finalWave);

    return { finalWave, flagWaves: uniqueFlags, progress, isHugeWave };
  }, [waveConfigRaw, waveNumber, zombieCount, queueLen]);

  if (status === "idle") return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 180,
        maxWidth: 280,
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: "#c0e8a0",
          fontWeight: 700,
        }}
      >
        <span>
          {waveNumber <= 0 ? (
            <span style={{ opacity: 0.65 }}>Preparing…</span>
          ) : (
            <>
              Wave{" "}
              <span style={{ color: "#e0ffe0", fontSize: 13 }}>{waveNumber}</span>
              <span style={{ opacity: 0.6 }}> / {finalWave}</span>
            </>
          )}
        </span>
        {isHugeWave && (
          <span
            style={{
              color: "#ff6b4a",
              fontWeight: 900,
              fontSize: 10,
              letterSpacing: 0.4,
              animation: "pulse 1s ease-in-out infinite",
            }}
          >
            ⚑ HUGE WAVE!
          </span>
        )}
      </div>

      <div
        style={{
          position: "relative",
          height: 14,
          borderRadius: 7,
          background: "linear-gradient(180deg,#1a2a10,#0a1508)",
          border: "2px solid #3a5a20",
          overflow: "hidden",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
        }}
      >
        {/* Fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.round(progress * 100)}%`,
            background: isHugeWave
              ? "linear-gradient(90deg,#c44a20,#ff8c40)"
              : "linear-gradient(90deg,#3a8a20,#7acc40)",
            transition: "width 0.35s ease-out",
          }}
        />

        {/* Flag markers */}
        {flagWaves.map((n) => {
          const left = `${(n / finalWave) * 100}%`;
          const reached = waveNumber >= n;
          return (
            <div
              key={n}
              title={`Flag wave ${n}`}
              style={{
                position: "absolute",
                left,
                top: -2,
                transform: "translateX(-50%)",
                fontSize: 12,
                lineHeight: 1,
                filter: reached ? "none" : "grayscale(0.6) opacity(0.7)",
                zIndex: 2,
              }}
            >
              ⚑
            </div>
          );
        })}

        {/* House / end marker */}
        <div
          style={{
            position: "absolute",
            right: 2,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            fontSize: 10,
            zIndex: 2,
          }}
          title="Final wave"
        >
          🏠
        </div>
      </div>
    </div>
  );
}
