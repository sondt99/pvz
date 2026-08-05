"use client";

import { useMemo } from "react";
import { useGameStore } from "@/store/game-store";
import { getFinalWaveNumber, parseWaveConfig } from "@/engine/wave-generator";

/**
 * PvZ-style wave / flag progress strip.
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
      for (const w of (cfg as { waves: Array<{ waveNumber?: number; flag?: boolean; final?: boolean }> })
        .waves) {
        const n = w.waveNumber;
        if (typeof n === "number" && (w.flag || w.final)) flagWaves.push(n);
      }
    }
    if (flagWaves.length === 0) {
      if (finalWave >= 2) flagWaves.push(finalWave);
      if (finalWave >= 5) flagWaves.push(Math.ceil(finalWave / 2));
    }
    const uniqueFlags = [...new Set(flagWaves)]
      .filter((n) => n >= 1 && n <= finalWave)
      .sort((a, b) => a - b);

    let progress = 0;
    if (waveNumber <= 0) {
      progress = 0;
    } else if (waveNumber >= finalWave && zombieCount === 0 && queueLen === 0) {
      progress = 1;
    } else {
      const base = Math.max(0, waveNumber - 1) / finalWave;
      const within = 1 / finalWave;
      const remainingPressure = zombieCount + queueLen;
      const partial =
        remainingPressure <= 0
          ? within * 0.85
          : within * Math.min(0.85, 0.15 + 0.7 / (1 + remainingPressure * 0.15));
      progress = Math.min(0.98, base + partial);
    }

    const isHugeWave =
      waveNumber > 0 && (uniqueFlags.includes(waveNumber) || waveNumber === finalWave);

    return { finalWave, flagWaves: uniqueFlags, progress, isHugeWave };
  }, [waveConfigRaw, waveNumber, zombieCount, queueLen]);

  if (status === "idle") return null;

  return (
    <div className="pvz-wave-bar">
      <div className="pvz-wave-bar__labels">
        <span>
          {waveNumber <= 0 ? (
            <span style={{ opacity: 0.7 }}>Preparing…</span>
          ) : (
            <>
              Wave{" "}
              <span style={{ color: "#fff8e0", fontSize: "0.85rem" }}>{waveNumber}</span>
              <span style={{ opacity: 0.55 }}> / {finalWave}</span>
            </>
          )}
        </span>
        {isHugeWave && (
          <span
            className="pvz-badge pvz-badge--danger"
            style={{ animation: "pvz-pulse 1s ease-in-out infinite" }}
          >
            ⚑ Huge wave
          </span>
        )}
      </div>

      <div className="pvz-wave-bar__track">
        <div
          className={
            isHugeWave ? "pvz-wave-bar__fill pvz-wave-bar__fill--huge" : "pvz-wave-bar__fill"
          }
          style={{ width: `${Math.round(progress * 100)}%` }}
        />

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
                top: -3,
                transform: "translateX(-50%)",
                fontSize: 13,
                lineHeight: 1,
                filter: reached ? "none" : "grayscale(0.7) opacity(0.65)",
                zIndex: 2,
                textShadow: "0 1px 2px rgba(0,0,0,0.8)",
              }}
            >
              ⚑
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            right: 3,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            fontSize: 11,
            zIndex: 2,
          }}
          title="House"
        >
          🏠
        </div>
      </div>
    </div>
  );
}
