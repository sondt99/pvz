"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/game-store";
import type { EnvironmentType, RuntimePlant, RuntimeZombie, RuntimeProjectile, RuntimeSunDrop } from "@/engine/types";

const CELL_SIZE = 80;

// ---------------------------------------------------------------------------
// Color maps
// ---------------------------------------------------------------------------
const BG_COLORS: Record<EnvironmentType, string> = {
  DAY: "#7ec850",
  NIGHT: "#1a2a1a",
  POOL: "#4a9e6b",
  FOG: "#8a9a6b",
  ROOF: "#8a7a6b",
};

const PLANT_COLORS: Record<string, string> = {
  PEASHOOTER: "#2e8b57",
  SUNFLOWER: "#ffd700",
  WALL_NUT: "#8b6914",
  SNOW_PEA: "#00ced1",
  CHERRY_BOMB: "#dc143c",
  POTATO_MINE: "#8b7355",
  REPEATER: "#228b22",
  PUFF_SHROOM: "#9370db",
  SUN_SHROOM: "#daa520",
  FUME_SHROOM: "#6b8e23",
  LILY_PAD: "#3cb371",
  SPIKEWEED: "#556b2f",
  TORCHWOOD: "#ff4500",
  TWIN_SUNFLOWER: "#ffa500",
  GATLING_PEA: "#006400",
  TALL_NUT: "#a0522d",
};

const PROJECTILE_COLORS: Record<string, string> = {
  PEA: "#32cd32",
  FROZEN_PEA: "#00bfff",
  FIRE_PEA: "#ff4500",
  FUME: "#adff2f",
  default: "#ffffff",
};

// ---------------------------------------------------------------------------
// Draw helpers
// ---------------------------------------------------------------------------
function drawBackground(
  ctx: CanvasRenderingContext2D,
  envType: EnvironmentType,
  gridRows: number,
  gridCols: number,
  waterLaneIndices: number[],
): void {
  ctx.fillStyle = BG_COLORS[envType] ?? "#7ec850";
  ctx.fillRect(0, 0, gridCols * CELL_SIZE, gridRows * CELL_SIZE);

  // Water lanes for POOL environment
  if (envType === "POOL" && waterLaneIndices.length > 0) {
    ctx.fillStyle = "#2a6ba0";
    for (const lane of waterLaneIndices) {
      ctx.fillRect(0, lane * CELL_SIZE, gridCols * CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  gridRows: number,
  gridCols: number,
  waterLaneIndices: number[],
): void {
  for (let row = 0; row < gridRows; row++) {
    const isWaterLane = waterLaneIndices.includes(row);
    for (let col = 0; col < gridCols; col++) {
      const isLight = (row + col) % 2 === 0;
      if (isWaterLane) {
        ctx.fillStyle = isLight ? "#3a7ec0" : "#2a6ba0";
      } else {
        ctx.fillStyle = isLight ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
      }
      ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      // Subtle grid border
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, plant: RuntimePlant): void {
  const x = plant.col * CELL_SIZE;
  const y = plant.row * CELL_SIZE;
  const padding = 8;
  const size = CELL_SIZE - padding * 2;

  // Plant body
  ctx.fillStyle = PLANT_COLORS[plant.plantType] ?? "#2e8b57";
  ctx.beginPath();
  ctx.roundRect(x + padding, y + padding + 10, size, size - 10, 6);
  ctx.fill();

  // Health bar background
  const barY = y + 4;
  const barW = CELL_SIZE - 16;
  ctx.fillStyle = "#cc0000";
  ctx.fillRect(x + 8, barY, barW, 5);

  // Health bar fill
  const healthPct = plant.maxHealth > 0 ? plant.health / plant.maxHealth : 0;
  ctx.fillStyle = "#00dd00";
  ctx.fillRect(x + 8, barY, Math.floor(barW * healthPct), 5);

  // Plant type label (abbreviated)
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(plant.plantType.slice(0, 3), x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 14);
}

function drawZombie(ctx: CanvasRenderingContext2D, zombie: RuntimeZombie, gridRows: number): void {
  // x is fractional column (0 = house side, 9.5 = off-screen right)
  const px = zombie.x * CELL_SIZE;
  const py = zombie.lane * CELL_SIZE;
  const padding = 6;
  const w = CELL_SIZE - padding * 2;
  const h = CELL_SIZE - padding * 2;

  // Skip if completely off-screen
  if (px + CELL_SIZE < 0 || py > gridRows * CELL_SIZE) return;

  // Zombie body
  ctx.fillStyle = zombie.isFrozen ? "#6aadcf" : "#b22222";
  ctx.fillRect(px + padding, py + padding + 10, w, h - 10);

  // Head
  ctx.fillStyle = zombie.isFrozen ? "#9ad4e8" : "#d4956a";
  ctx.fillRect(px + padding + 6, py + padding, w - 12, 14);

  // Armor overlay
  if (zombie.armorHealth > 0) {
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 3;
    ctx.strokeRect(px + padding, py + padding + 10, w, h - 10);
  }

  // Health bar
  const barY = py + 2;
  const barW = CELL_SIZE - 16;
  const healthPct = zombie.maxHealth > 0 ? zombie.health / zombie.maxHealth : 0;
  ctx.fillStyle = "#330000";
  ctx.fillRect(px + 8, barY, barW, 4);
  ctx.fillStyle = "#ff4444";
  ctx.fillRect(px + 8, barY, Math.floor(barW * healthPct), 4);
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: RuntimeProjectile): void {
  // x is fractional column position
  const px = proj.x * CELL_SIZE;
  const py = proj.lane * CELL_SIZE + CELL_SIZE / 2 - proj.y * CELL_SIZE;

  ctx.fillStyle = PROJECTILE_COLORS[proj.projectileType] ?? PROJECTILE_COLORS.default;
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fill();

  // Glow effect
  ctx.strokeStyle = ctx.fillStyle;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawSunDrop(ctx: CanvasRenderingContext2D, drop: RuntimeSunDrop): void {
  const px = drop.x * CELL_SIZE + CELL_SIZE / 2;
  const py = drop.y * CELL_SIZE + CELL_SIZE / 2;
  const radius = drop.state === "landed" ? 18 : 14;

  // Sun glow
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#ffff00";
  ctx.beginPath();
  ctx.arc(px, py, radius + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Sun body
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fill();

  // Sun value text
  ctx.fillStyle = "#7a4400";
  ctx.font = `bold ${drop.value >= 100 ? 9 : 11}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(drop.value), px, py);
  ctx.textBaseline = "alphabetic";
}

// ---------------------------------------------------------------------------
// GameCanvas component
// ---------------------------------------------------------------------------
interface GameCanvasProps {
  onCellClick?: (col: number, row: number) => void;
}

export function GameCanvas({ onCellClick }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const status = useGameStore((s) => s.status);
  const environment = useGameStore((s) => s.environment);

  const canvasW = environment.gridCols * CELL_SIZE;
  const canvasH = environment.gridRows * CELL_SIZE;

  // Render loop — reads state directly from store on each frame (no re-render)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function render() {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const state = useGameStore.getState();
      const { environment: env, plants, zombies, projectiles, sunDrops } = state;

      // 1. Background
      drawBackground(ctx, env.type, env.gridRows, env.gridCols, env.waterLaneIndices);

      // 2. Grid
      drawGrid(ctx, env.gridRows, env.gridCols, env.waterLaneIndices);

      // 3. Plants
      for (const plant of Object.values(plants)) {
        drawPlant(ctx, plant);
      }

      // 4. Zombies
      for (const zombie of Object.values(zombies)) {
        drawZombie(ctx, zombie, env.gridRows);
      }

      // 5. Projectiles
      for (const proj of Object.values(projectiles)) {
        drawProjectile(ctx, proj);
      }

      // 6. Sun drops
      for (const drop of Object.values(sunDrops)) {
        if (drop.state !== "collected") {
          drawSunDrop(ctx, drop);
        }
      }

      // 7. Overlay for game-over / victory
      const currentStatus = state.status;
      if (currentStatus === "game-over" || currentStatus === "victory") {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = currentStatus === "victory" ? "#ffd700" : "#ff4444";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          currentStatus === "victory" ? "YOU WIN!" : "GAME OVER",
          canvas.width / 2,
          canvas.height / 2,
        );
        ctx.textBaseline = "alphabetic";
        return; // stop rAF after rendering the overlay once
      }

      rafRef.current = requestAnimationFrame(render);
    }

    // Start or restart the render loop when status changes
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [status]); // re-bind when status changes so we can show the overlay

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onCellClick) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const row = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    onCellClick(col, row);
  }

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      onClick={handleClick}
      style={{
        display: "block",
        cursor: "crosshair",
        border: "3px solid #2a4a1a",
        borderRadius: "4px",
        imageRendering: "pixelated",
      }}
    />
  );
}
