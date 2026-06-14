"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/game-store";
import { useGameLoop } from "@/hooks/useGameLoop";
import { GameCanvas } from "@/components/game/GameCanvas";
import { SeedPacketBar } from "@/components/game/SeedPacketBar";
import { GameHUD } from "@/components/game/GameHUD";
import type { EnvironmentConfig, SeedPacketSlot } from "@/engine/types";
import { GRID_COLS, GRID_ROWS_STANDARD } from "@/engine/constants";

const DAY_ENVIRONMENT: EnvironmentConfig = {
  type: "DAY",
  gridRows: GRID_ROWS_STANDARD,
  gridCols: GRID_COLS,
  waterLaneIndices: [],
  gravesEnabled: false,
  fogEnabled: false,
  slopeEnabled: false,
  conveyorBelt: false,
  skyDropSun: true,
};

const DEFAULT_LOADOUT: SeedPacketSlot[] = [
  {
    plantType: "PEASHOOTER",
    plantId: "PEASHOOTER",
    sunCost: 100,
    cooldownRemainingMs: 0,
    cooldownTotalMs: 7000,
    isSelected: false,
    slotIndex: 0,
  },
  {
    plantType: "SUNFLOWER",
    plantId: "SUNFLOWER",
    sunCost: 50,
    cooldownRemainingMs: 0,
    cooldownTotalMs: 7000,
    isSelected: false,
    slotIndex: 1,
  },
  {
    plantType: "WALL_NUT",
    plantId: "WALL_NUT",
    sunCost: 50,
    cooldownRemainingMs: 0,
    cooldownTotalMs: 30000,
    isSelected: false,
    slotIndex: 2,
  },
  {
    plantType: "SNOW_PEA",
    plantId: "SNOW_PEA",
    sunCost: 175,
    cooldownRemainingMs: 0,
    cooldownTotalMs: 7000,
    isSelected: false,
    slotIndex: 3,
  },
  {
    plantType: "CHERRY_BOMB",
    plantId: "CHERRY_BOMB",
    sunCost: 150,
    cooldownRemainingMs: 0,
    cooldownTotalMs: 50000,
    isSelected: false,
    slotIndex: 4,
  },
];

export default function GamePage() {
  const status = useGameStore((s) => s.status);
  const selectedSlot = useGameStore((s) => s.selectedSlot);
  const loadout = useGameStore((s) => s.loadout);

  // Initialize and start game on mount
  useEffect(() => {
    const store = useGameStore.getState();
    store.initGame(DAY_ENVIRONMENT, DEFAULT_LOADOUT);
    store.startGame();
  }, []);

  // Wire up the game loop
  useGameLoop();

  // Handle grid cell clicks: place plant if slot selected
  function handleCellClick(col: number, row: number) {
    const store = useGameStore.getState();
    if (store.selectedSlot === null) return;

    const slot = store.loadout[store.selectedSlot];
    if (!slot) return;

    const placed = store.placePlant(slot.plantType, row, col);
    if (placed) {
      // Deselect after placement
      store.selectSlot(null);
    }
  }

  // Handle clicking sun drops on the canvas
  function handleSunClick(col: number, row: number) {
    const store = useGameStore.getState();
    // Check if a sun drop is at this approximate position
    for (const [dropId, drop] of Object.entries(store.sunDrops)) {
      const dropCol = Math.floor(drop.x);
      const dropRow = Math.floor(drop.y);
      if (Math.abs(dropCol - col) <= 1 && Math.abs(dropRow - row) <= 1) {
        store.collectSunDrop(dropId);
        return;
      }
    }
    // Otherwise try to place a plant
    handleCellClick(col, row);
  }

  const isGameOver = status === "game-over";
  const isVictory = status === "victory";
  const showOverlay = isGameOver || isVictory;

  // Determine current selected slot name for cursor hint
  const selectedSlotData = selectedSlot !== null ? loadout[selectedSlot] : null;

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#0a1a05",
        fontFamily: "sans-serif",
        overflow: "hidden",
      }}
    >
      {/* HUD */}
      <GameHUD />

      {/* Canvas area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          position: "relative",
          overflow: "auto",
        }}
      >
        {/* Selected slot hint */}
        {selectedSlotData && !showOverlay && (
          <div
            style={{
              position: "absolute",
              top: 24,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.75)",
              color: "#ffd700",
              borderRadius: 8,
              padding: "4px 14px",
              fontSize: 13,
              fontWeight: "bold",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            Click a cell to place {selectedSlotData.plantType.replace(/_/g, " ")}
          </div>
        )}

        <GameCanvas onCellClick={handleSunClick} />

        {/* Game-over / victory overlay (outside canvas) */}
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
                  store.initGame(DAY_ENVIRONMENT, DEFAULT_LOADOUT);
                  store.startGame();
                }}
                style={{
                  background: "#2a7a2a",
                  color: "#e0ffe0",
                  border: "2px solid #4aaa4a",
                  borderRadius: 10,
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
                  borderRadius: 10,
                  padding: "12px 28px",
                  fontSize: 18,
                  fontWeight: "bold",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                ← Main Menu
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Seed packet bar */}
      <SeedPacketBar />
    </main>
  );
}
