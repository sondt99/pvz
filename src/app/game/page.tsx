"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/game-store";
import { useGameLoop } from "@/hooks/useGameLoop";
import { GameCanvas } from "@/components/game/GameCanvas";
import { GameHUD } from "@/components/game/GameHUD";
import { SeedPacketBar } from "@/components/game/SeedPacketBar";
import { GRID_COLS, GRID_ROWS_POOL, GRID_ROWS_STANDARD } from "@/engine/constants";
import type { EnvironmentConfig, EnvironmentType, SeedPacketSlot } from "@/engine/types";

const ENVIRONMENTS: Record<EnvironmentType, EnvironmentConfig> = {
  DAY: {
    type: "DAY",
    gridRows: GRID_ROWS_STANDARD,
    gridCols: GRID_COLS,
    waterLaneIndices: [],
    gravesEnabled: false,
    fogEnabled: false,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: true,
  },
  NIGHT: {
    type: "NIGHT",
    gridRows: GRID_ROWS_STANDARD,
    gridCols: GRID_COLS,
    waterLaneIndices: [],
    gravesEnabled: true,
    fogEnabled: false,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: false,
  },
  POOL: {
    type: "POOL",
    gridRows: GRID_ROWS_POOL,
    gridCols: GRID_COLS,
    waterLaneIndices: [2, 3],
    gravesEnabled: false,
    fogEnabled: false,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: true,
  },
  FOG: {
    type: "FOG",
    gridRows: GRID_ROWS_POOL,
    gridCols: GRID_COLS,
    waterLaneIndices: [2, 3],
    gravesEnabled: false,
    fogEnabled: true,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: false,
  },
  ROOF: {
    type: "ROOF",
    gridRows: GRID_ROWS_STANDARD,
    gridCols: GRID_COLS,
    waterLaneIndices: [],
    gravesEnabled: false,
    fogEnabled: false,
    slopeEnabled: true,
    conveyorBelt: false,
    skyDropSun: true,
  },
};

const ENVIRONMENT_ORDER: EnvironmentType[] = ["DAY", "NIGHT", "POOL", "FOG", "ROOF"];

const PLANT_COSTS: Record<string, number> = {
  PEASHOOTER: 100,
  SUNFLOWER: 50,
  WALL_NUT: 50,
  SNOW_PEA: 175,
  CHERRY_BOMB: 150,
  POTATO_MINE: 25,
  PUFF_SHROOM: 0,
  SUN_SHROOM: 25,
  FUME_SHROOM: 75,
  ICE_SHROOM: 75,
  LILY_PAD: 25,
  TANGLE_KELP: 25,
  SEA_SHROOM: 0,
  PLANTERN: 25,
  BLOVER: 100,
  SPLIT_PEA: 125,
  FLOWER_POT: 25,
  CABBAGE_PULT: 100,
  KERNEL_PULT: 100,
  MELON_PULT: 300,
};

const PLANT_RECHARGE_MS: Record<string, number> = {
  CHERRY_BOMB: 50_000,
  WALL_NUT: 30_000,
  POTATO_MINE: 30_000,
  ICE_SHROOM: 50_000,
  TANGLE_KELP: 30_000,
  BLOVER: 30_000,
  default: 7_500,
};

const LOADOUTS: Record<EnvironmentType, string[]> = {
  DAY: ["SUNFLOWER", "PEASHOOTER", "WALL_NUT", "POTATO_MINE", "SNOW_PEA", "CHERRY_BOMB"],
  NIGHT: ["SUN_SHROOM", "PUFF_SHROOM", "FUME_SHROOM", "WALL_NUT", "ICE_SHROOM", "CHERRY_BOMB"],
  POOL: ["SUNFLOWER", "PEASHOOTER", "LILY_PAD", "TANGLE_KELP", "WALL_NUT", "SNOW_PEA"],
  FOG: ["SUN_SHROOM", "SEA_SHROOM", "LILY_PAD", "PLANTERN", "BLOVER", "SPLIT_PEA"],
  ROOF: ["FLOWER_POT", "CABBAGE_PULT", "KERNEL_PULT", "WALL_NUT", "CHERRY_BOMB", "MELON_PULT"],
};

function makeLoadout(envType: EnvironmentType): SeedPacketSlot[] {
  return LOADOUTS[envType].map((plantType, index) => ({
    plantType,
    plantId: plantType,
    sunCost: PLANT_COSTS[plantType] ?? 100,
    cooldownRemainingMs: 0,
    cooldownTotalMs: PLANT_RECHARGE_MS[plantType] ?? PLANT_RECHARGE_MS.default,
    isSelected: false,
    slotIndex: index,
  }));
}

function parseEnvironmentParam(): EnvironmentType {
  if (typeof window === "undefined") return "DAY";
  const raw = new URLSearchParams(window.location.search).get("env")?.toUpperCase();
  return ENVIRONMENT_ORDER.includes(raw as EnvironmentType) ? (raw as EnvironmentType) : "DAY";
}

export default function GamePage() {
  const [activeEnvironment, setActiveEnvironment] = useState<EnvironmentType>("DAY");
  const status = useGameStore((s) => s.status);
  const selectedSlot = useGameStore((s) => s.selectedSlot);
  const loadout = useGameStore((s) => s.loadout);

  useEffect(() => {
    setActiveEnvironment(parseEnvironmentParam());
  }, []);

  useEffect(() => {
    const store = useGameStore.getState();
    store.initGame(ENVIRONMENTS[activeEnvironment], makeLoadout(activeEnvironment));
    store.startGame();
  }, [activeEnvironment]);

  useGameLoop();

  function handleCellClick(col: number, row: number) {
    const store = useGameStore.getState();
    if (store.selectedSlot === null) return;

    const slot = store.loadout[store.selectedSlot];
    if (!slot) return;

    const placed = store.placePlant(slot.plantType, row, col);
    if (placed) {
      store.selectSlot(null);
    }
  }

  function handleSunClick(col: number, row: number) {
    const store = useGameStore.getState();
    for (const [dropId, drop] of Object.entries(store.sunDrops)) {
      const dropCol = Math.floor(drop.x);
      const dropRow = Math.floor(drop.y);
      if (Math.abs(dropCol - col) <= 1 && Math.abs(dropRow - row) <= 1) {
        store.collectSunDrop(dropId);
        return;
      }
    }
    handleCellClick(col, row);
  }

  function switchEnvironment(envType: EnvironmentType) {
    if (envType === activeEnvironment) return;
    setActiveEnvironment(envType);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/game?env=${envType}`);
    }
  }

  const isGameOver = status === "game-over";
  const isVictory = status === "victory";
  const showOverlay = isGameOver || isVictory;
  const selectedPlant = selectedSlot !== null ? loadout[selectedSlot]?.plantType.replace(/_/g, " ") : activeEnvironment;

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "radial-gradient(circle at center, #143615 0%, #071608 64%, #030b04 100%)",
        fontFamily: "sans-serif",
        overflow: "hidden",
      }}
    >
      <GameHUD />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "14px 18px 16px",
          position: "relative",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            width: "min(100%, 1080px)",
          }}
        >
          {ENVIRONMENT_ORDER.map((envType) => {
            const selected = envType === activeEnvironment;
            return (
              <button
                key={envType}
                onClick={() => switchEnvironment(envType)}
                style={{
                  minWidth: 84,
                  height: 34,
                  border: selected ? "2px solid #ffe56a" : "1px solid rgba(218, 245, 176, 0.28)",
                  borderRadius: 7,
                  background: selected ? "rgba(255, 213, 74, 0.22)" : "rgba(20, 48, 22, 0.72)",
                  color: selected ? "#fff5a6" : "#cfeab8",
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: 0,
                  cursor: "pointer",
                  boxShadow: selected ? "0 0 16px rgba(255, 220, 74, 0.2)" : "none",
                }}
              >
                {envType}
              </button>
            );
          })}
        </div>

        <div
          style={{
            width: "min(100%, 1080px)",
            minHeight: 20,
            display: "flex",
            justifyContent: selectedSlot !== null && !showOverlay ? "center" : "flex-end",
            color: "#f5dd7a",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          <span>{selectedPlant}</span>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <GameCanvas onCellClick={handleSunClick} />

          {showOverlay && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
                pointerEvents: "auto",
              }}
            >
              <h1
                style={{
                  fontSize: 56,
                  fontWeight: "bold",
                  color: isVictory ? "#ffd700" : "#ff4444",
                  textShadow: "0 0 20px rgba(0,0,0,0.8)",
                  margin: 0,
                }}
              >
                {isVictory ? "YOU WIN!" : "GAME OVER"}
              </h1>

              <div style={{ display: "flex", gap: 16 }}>
                <button
                  onClick={() => {
                    const store = useGameStore.getState();
                    store.initGame(ENVIRONMENTS[activeEnvironment], makeLoadout(activeEnvironment));
                    store.startGame();
                  }}
                  style={{
                    background: "#2a7a2a",
                    color: "#e0ffe0",
                    border: "2px solid #4aaa4a",
                    borderRadius: 8,
                    padding: "12px 28px",
                    fontSize: 18,
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Play Again
                </button>
                <Link
                  href="/"
                  style={{
                    background: "#2a2a5a",
                    color: "#c0c0ff",
                    border: "2px solid #4a4aaa",
                    borderRadius: 8,
                    padding: "12px 28px",
                    fontSize: 18,
                    fontWeight: "bold",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  Main Menu
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <SeedPacketBar />
    </main>
  );
}
