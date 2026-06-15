"use client";

import { useEffect, useRef } from "react";
import { FOG_START_COL, TILE_H, TILE_W } from "@/engine/constants";
import { useGameStore } from "@/store/game-store";
import type {
  EnvironmentType,
  RuntimeLawnMower,
  RuntimePlant,
  RuntimeProjectile,
  RuntimeGridCell,
  RuntimeSunDrop,
  RuntimeZombie,
} from "@/engine/types";

const CELL_W = TILE_W;
const CELL_H = TILE_H;
const HOUSE_W = 132;
const SPAWN_W = 122;
const TOP_PAD = 30;
const BOTTOM_PAD = 22;

type Palette = {
  skyTop: string;
  skyBottom: string;
  groundA: string;
  groundB: string;
  laneLine: string;
  border: string;
};

const PALETTES: Record<EnvironmentType, Palette> = {
  DAY: {
    skyTop: "#9bdc68",
    skyBottom: "#518d38",
    groundA: "#83c454",
    groundB: "#6fb245",
    laneLine: "rgba(38, 94, 31, 0.32)",
    border: "#3f7b2b",
  },
  NIGHT: {
    skyTop: "#1d3240",
    skyBottom: "#18251c",
    groundA: "#3f7043",
    groundB: "#315d37",
    laneLine: "rgba(156, 206, 135, 0.18)",
    border: "#203f28",
  },
  POOL: {
    skyTop: "#86cc76",
    skyBottom: "#477f44",
    groundA: "#78bf53",
    groundB: "#63aa44",
    laneLine: "rgba(31, 82, 39, 0.28)",
    border: "#336c35",
  },
  FOG: {
    skyTop: "#7d927e",
    skyBottom: "#4c614d",
    groundA: "#6f9b5c",
    groundB: "#5d8b52",
    laneLine: "rgba(210, 230, 196, 0.18)",
    border: "#496647",
  },
  ROOF: {
    skyTop: "#96715f",
    skyBottom: "#57423b",
    groundA: "#9b5e45",
    groundB: "#874f3e",
    laneLine: "rgba(64, 30, 21, 0.3)",
    border: "#5f372f",
  },
};

const PROJECTILE_COLORS: Record<string, string> = {
  PEA: "#68d65d",
  FROZEN_PEA: "#8ce8ff",
  FIRE_PEA: "#ff7a2a",
  FUME: "#c3f582",
  SPORE: "#cda7ff",
  CABBAGE: "#a6df6b",
  KERNEL: "#ffd76a",
  BUTTER: "#ffe98a",
  MELON: "#76cb62",
  STAR: "#ffe066",
  SPIKE: "#d0f0a0",
  default: "#ffffff",
};

type CanvasEffect = {
  type: "explosion" | "hit-flash";
  x: number;
  y: number;
  radius: number;
  color: string;
  startMs: number;
  durationMs: number;
};

const INSTANT_PLANT_COLORS: Record<string, string> = {
  CHERRY_BOMB: "#ff5511",
  DOOM_SHROOM: "#8822cc",
  JALAPENO: "#ff6600",
  ICE_SHROOM: "#44ccff",
  BLOVER: "#aaccff",
  SQUASH: "#88cc22",
};

function boardW(gridCols: number): number {
  return gridCols * CELL_W;
}

function boardH(gridRows: number): number {
  return gridRows * CELL_H;
}

function canvasW(gridCols: number): number {
  return HOUSE_W + boardW(gridCols) + SPAWN_W;
}

function canvasH(gridRows: number): number {
  return TOP_PAD + boardH(gridRows) + BOTTOM_PAD;
}

function tileX(col: number): number {
  return HOUSE_W + col * CELL_W;
}

function tileY(row: number): number {
  return TOP_PAD + row * CELL_H;
}

function drawSceneBackdrop(
  ctx: CanvasRenderingContext2D,
  envType: EnvironmentType,
  gridRows: number,
  gridCols: number,
): void {
  const palette = PALETTES[envType];
  const w = canvasW(gridCols);
  const h = canvasH(gridRows);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, palette.skyTop);
  bg.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = envType === "NIGHT" ? "#172526" : "#d7b579";
  ctx.fillRect(0, TOP_PAD - 8, HOUSE_W, boardH(gridRows) + 16);

  ctx.fillStyle = envType === "NIGHT" ? "#20333a" : "#ebd194";
  for (let y = TOP_PAD + 18; y < TOP_PAD + boardH(gridRows); y += 42) {
    ctx.fillRect(10, y, HOUSE_W - 22, 5);
  }

  ctx.fillStyle = envType === "NIGHT" ? "#384b55" : "#a45b43";
  ctx.beginPath();
  ctx.moveTo(4, TOP_PAD - 12);
  ctx.lineTo(HOUSE_W - 18, TOP_PAD - 38);
  ctx.lineTo(HOUSE_W + 2, TOP_PAD - 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = envType === "NIGHT" ? "#ffd67a" : "#5d8fb7";
  ctx.globalAlpha = envType === "NIGHT" ? 0.65 : 0.9;
  ctx.fillRect(26, TOP_PAD + 42, 34, 44);
  ctx.fillRect(78, TOP_PAD + 108, 34, 44);
  ctx.globalAlpha = 1;

  const spawnX = HOUSE_W + boardW(gridCols);
  const dirt = ctx.createLinearGradient(spawnX, 0, w, 0);
  dirt.addColorStop(0, "rgba(63, 53, 38, 0.08)");
  dirt.addColorStop(1, "rgba(58, 38, 24, 0.48)");
  ctx.fillStyle = dirt;
  ctx.fillRect(spawnX, TOP_PAD, SPAWN_W, boardH(gridRows));
}

function drawGrassTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  envType: EnvironmentType,
): void {
  const seed = Math.floor(x * 13 + y * 7);
  ctx.strokeStyle = envType === "NIGHT" ? "rgba(167, 207, 151, 0.16)" : "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const gx = x + ((seed + i * 37) % Math.max(1, w));
    const gy = y + 12 + ((seed + i * 17) % Math.max(1, h - 20));
    ctx.beginPath();
    ctx.moveTo(gx, gy + 6);
    ctx.lineTo(gx + 3, gy);
    ctx.lineTo(gx + 7, gy + 5);
    ctx.stroke();
  }
}

function drawWaterLane(ctx: CanvasRenderingContext2D, row: number, gridCols: number, envType: EnvironmentType): void {
  const x = HOUSE_W;
  const y = tileY(row);
  const w = boardW(gridCols);
  const water = ctx.createLinearGradient(0, y, 0, y + CELL_H);
  water.addColorStop(0, envType === "FOG" ? "#407c95" : "#3b97c8");
  water.addColorStop(0.5, envType === "FOG" ? "#2f7189" : "#267db3");
  water.addColorStop(1, envType === "FOG" ? "#235a73" : "#1f679b");
  ctx.fillStyle = water;
  ctx.fillRect(x, y, w, CELL_H);

  ctx.strokeStyle = "rgba(220, 255, 255, 0.36)";
  ctx.lineWidth = 2;
  for (let i = 0; i < gridCols * 2; i++) {
    const sx = x + i * (CELL_W / 2) + ((row % 2) * 12);
    const sy = y + 24 + (i % 3) * 13;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx + 13, sy - 8, sx + 24, sy + 8, sx + 39, sy);
    ctx.stroke();
  }
}

function drawRoofLane(ctx: CanvasRenderingContext2D, row: number, gridCols: number, palette: Palette): void {
  const y = tileY(row);
  const w = boardW(gridCols);
  const x = HOUSE_W;
  const grad = ctx.createLinearGradient(0, y, 0, y + CELL_H);
  grad.addColorStop(0, row % 2 === 0 ? "#a75f45" : "#94523c");
  grad.addColorStop(1, row % 2 === 0 ? "#854936" : "#744032");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, CELL_H);

  ctx.strokeStyle = "rgba(69, 30, 24, 0.42)";
  ctx.lineWidth = 2;
  for (let col = 0; col <= gridCols; col++) {
    const tx = tileX(col);
    ctx.beginPath();
    ctx.moveTo(tx - 12, y);
    ctx.lineTo(tx + 8, y + CELL_H);
    ctx.stroke();
  }

  ctx.strokeStyle = palette.laneLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + CELL_H - 2);
  ctx.lineTo(x + w, y + CELL_H - 2);
  ctx.stroke();
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  envType: EnvironmentType,
  gridRows: number,
  gridCols: number,
  waterLaneIndices: number[],
  grid: RuntimeGridCell[][],
): void {
  const palette = PALETTES[envType];
  const x = HOUSE_W;
  const y = TOP_PAD;
  const w = boardW(gridCols);
  const h = boardH(gridRows);

  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = palette.border;
  ctx.beginPath();
  ctx.roundRect(x - 8, y - 8, w + 16, h + 16, 14);
  ctx.fill();
  ctx.shadowColor = "transparent";

  for (let row = 0; row < gridRows; row++) {
    const laneY = tileY(row);
    if (envType === "ROOF") {
      drawRoofLane(ctx, row, gridCols, palette);
      continue;
    }
    if (waterLaneIndices.includes(row)) {
      drawWaterLane(ctx, row, gridCols, envType);
      continue;
    }

    const lane = ctx.createLinearGradient(0, laneY, 0, laneY + CELL_H);
    lane.addColorStop(0, row % 2 === 0 ? palette.groundA : palette.groundB);
    lane.addColorStop(1, row % 2 === 0 ? "#5fa443" : "#57983d");
    ctx.fillStyle = lane;
    ctx.fillRect(x, laneY, w, CELL_H);
    drawGrassTexture(ctx, x, laneY, w, CELL_H, envType);
  }

  ctx.strokeStyle = palette.laneLine;
  ctx.lineWidth = 1;
  for (let row = 0; row <= gridRows; row++) {
    const lineY = TOP_PAD + row * CELL_H;
    ctx.beginPath();
    ctx.moveTo(x, lineY);
    ctx.lineTo(x + w, lineY);
    ctx.stroke();
  }

  ctx.strokeStyle = envType === "ROOF" ? "rgba(255, 206, 159, 0.12)" : "rgba(255,255,255,0.12)";
  for (let col = 0; col <= gridCols; col++) {
    const lineX = tileX(col);
    ctx.beginPath();
    ctx.moveTo(lineX, y);
    ctx.lineTo(lineX, y + h);
    ctx.stroke();
  }

  drawCraters(ctx, grid);

  if (envType === "NIGHT") {
    drawGraves(ctx, grid);
  }
}

function drawCraters(ctx: CanvasRenderingContext2D, grid: RuntimeGridCell[][]): void {
  for (const cell of grid.flat()) {
    if (cell.craterExpiresAtMs === null) continue;

    const cx = tileX(cell.col) + CELL_W / 2;
    const cy = tileY(cell.row) + CELL_H * 0.56;

    ctx.fillStyle = "rgba(18, 13, 9, 0.55)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5, 31, 18, -0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(246, 221, 161, 0.26)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy);
    ctx.lineTo(cx - 7, cy - 7);
    ctx.lineTo(cx + 2, cy - 2);
    ctx.moveTo(cx + 6, cy + 1);
    ctx.lineTo(cx + 20, cy - 8);
    ctx.moveTo(cx - 4, cy + 9);
    ctx.lineTo(cx + 10, cy + 16);
    ctx.stroke();
  }
}

function drawGraves(ctx: CanvasRenderingContext2D, grid: RuntimeGridCell[][]): void {
  for (const cell of grid.flat()) {
    if (!cell.graveId) continue;
    const { row, col } = cell;
    const cx = tileX(col) + CELL_W / 2;
    const baseY = tileY(row) + CELL_H * 0.72;
    ctx.fillStyle = "#60686a";
    ctx.beginPath();
    ctx.roundRect(cx - 18, baseY - 38, 36, 48, 14);
    ctx.fill();
    ctx.fillStyle = "#444b4d";
    ctx.fillRect(cx - 22, baseY + 4, 44, 8);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 9, baseY - 17);
    ctx.lineTo(cx + 9, baseY - 17);
    ctx.moveTo(cx, baseY - 27);
    ctx.lineTo(cx, baseY - 6);
    ctx.stroke();
  }
}

function drawLawnMower(ctx: CanvasRenderingContext2D, mower: RuntimeLawnMower): void {
  if (mower.state === "spent") return;

  const cx = HOUSE_W + mower.x * CELL_W + CELL_W / 2;
  const cy = tileY(mower.lane) + CELL_H * 0.72;
  const bodyColor = mower.state === "active" ? "#d93225" : "#b62f26";

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16, 32, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(cx - 28, cy - 18, 54, 24, 7);
  ctx.fill();

  ctx.fillStyle = "#8d2018";
  ctx.fillRect(cx - 18, cy - 31, 25, 16);
  ctx.strokeStyle = "#323232";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy - 25);
  ctx.lineTo(cx - 38, cy - 43);
  ctx.stroke();

  ctx.fillStyle = "#1f1f1f";
  for (const wheelX of [cx - 18, cx + 17]) {
    ctx.beginPath();
    ctx.arc(wheelX, cy + 7, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c9c9c9";
    ctx.beginPath();
    ctx.arc(wheelX, cy + 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f1f1f";
  }
}

function drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, pct: number, color: string): void {
  ctx.fillStyle = "rgba(33, 27, 18, 0.55)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, 5, 3);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0, w * Math.min(1, pct)), 5, 3);
  ctx.fill();
}

function drawPeashooter(ctx: CanvasRenderingContext2D, cx: number, cy: number, frozen = false): void {
  ctx.strokeStyle = frozen ? "#6db9c8" : "#2d7d3a";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + 24);
  ctx.quadraticCurveTo(cx - 8, cy + 2, cx + 1, cy - 14);
  ctx.stroke();

  ctx.fillStyle = frozen ? "#7ddcec" : "#55b54b";
  ctx.beginPath();
  ctx.ellipse(cx - 16, cy + 21, 18, 8, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 12, cy + 22, 18, 8, 0.35, 0, Math.PI * 2);
  ctx.fill();

  const head = ctx.createRadialGradient(cx - 8, cy - 22, 4, cx + 4, cy - 14, 27);
  head.addColorStop(0, frozen ? "#cbf8ff" : "#a5ed75");
  head.addColorStop(1, frozen ? "#3aaec8" : "#398f36");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(cx, cy - 18, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = frozen ? "#65bdd0" : "#3b9a3d";
  ctx.beginPath();
  ctx.ellipse(cx + 25, cy - 18, 18, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#11391e";
  ctx.beginPath();
  ctx.arc(cx - 7, cy - 24, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSunflower(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.strokeStyle = "#3f8736";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 26);
  ctx.lineTo(cx, cy - 8);
  ctx.stroke();

  ctx.fillStyle = "#4cad45";
  ctx.beginPath();
  ctx.ellipse(cx - 14, cy + 15, 18, 8, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 14, cy + 15, 18, 8, 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffcf38";
  for (let i = 0; i < 14; i++) {
    const a = (Math.PI * 2 * i) / 14;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * 21, cy - 17 + Math.sin(a) * 21, 9, 16, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#7b4b24";
  ctx.beginPath();
  ctx.arc(cx, cy - 17, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3b2614";
  ctx.beginPath();
  ctx.arc(cx - 7, cy - 21, 2.5, 0, Math.PI * 2);
  ctx.arc(cx + 7, cy - 21, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3b2614";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy - 17, 9, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

function drawWallNut(ctx: CanvasRenderingContext2D, cx: number, cy: number, tall = false): void {
  const h = tall ? 62 : 50;
  const w = tall ? 38 : 44;
  const nut = ctx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
  nut.addColorStop(0, "#d59a55");
  nut.addColorStop(1, "#8f5b2e");
  ctx.fillStyle = nut;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(70, 42, 22, 0.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy - h / 2 + 8);
  ctx.bezierCurveTo(cx - 18, cy - 2, cx + 8, cy + 12, cx - 5, cy + h / 2 - 6);
  ctx.stroke();
  ctx.fillStyle = "#2e1c12";
  ctx.beginPath();
  ctx.arc(cx - 8, cy - 5, 3, 0, Math.PI * 2);
  ctx.arc(cx + 8, cy - 5, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawBomb(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = "#c7202c";
  ctx.beginPath();
  ctx.arc(cx - 13, cy, 18, 0, Math.PI * 2);
  ctx.arc(cx + 13, cy + 3, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7b151c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 15);
  ctx.quadraticCurveTo(cx + 6, cy - 31, cx + 22, cy - 28);
  ctx.stroke();
  ctx.fillStyle = "#ff727a";
  ctx.beginPath();
  ctx.arc(cx - 18, cy - 6, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPumpkin(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const shell = ctx.createLinearGradient(cx - 34, cy - 18, cx + 34, cy + 28);
  shell.addColorStop(0, "#ffb347");
  shell.addColorStop(1, "#b9571b");
  ctx.fillStyle = shell;

  for (const offset of [-25, 25]) {
    ctx.beginPath();
    ctx.ellipse(cx + offset, cy + 8, 15, 27, offset < 0 ? -0.18 : 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.ellipse(cx, cy + 26, 27, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx, cy - 14, 18, 9, 0, Math.PI, 0);
  ctx.fill();

  ctx.strokeStyle = "#7a3514";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, 36, 29, 0, 0.12 * Math.PI, 1.88 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = "#513019";
  ctx.beginPath();
  ctx.roundRect(cx - 5, cy - 28, 10, 13, 4);
  ctx.fill();
}

function drawGarlic(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = "#eee5c8";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 3, 25, 32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#c6b98d";
  ctx.lineWidth = 3;
  for (const offset of [-11, 0, 11]) {
    ctx.beginPath();
    ctx.moveTo(cx + offset, cy - 21);
    ctx.quadraticCurveTo(cx + offset * 0.4, cy + 3, cx + offset * 0.2, cy + 28);
    ctx.stroke();
  }

  ctx.fillStyle = "#5b5f33";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 30, 9, 6, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawStarfruit(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = "#f4d94b";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 31 : 14;
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#9e8f22";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#57460f";
  ctx.beginPath();
  ctx.arc(cx - 7, cy - 3, 3, 0, Math.PI * 2);
  ctx.arc(cx + 8, cy - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#57460f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy + 7, 7, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();
}

function drawMushroom(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10, 27, 18, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#e9d7ba";
  ctx.beginPath();
  ctx.roundRect(cx - 12, cy - 9, 24, 30, 10);
  ctx.fill();
}

function drawRepeater(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Stem
  ctx.strokeStyle = "#2d7d3a";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + 24);
  ctx.quadraticCurveTo(cx - 8, cy + 2, cx + 1, cy - 14);
  ctx.stroke();
  // Leaves
  ctx.fillStyle = "#55b54b";
  ctx.beginPath();
  ctx.ellipse(cx - 16, cy + 21, 18, 8, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 12, cy + 22, 18, 8, 0.35, 0, Math.PI * 2);
  ctx.fill();
  // Head 1 (upper)
  const g1 = ctx.createRadialGradient(cx - 8, cy - 24, 3, cx, cy - 18, 22);
  g1.addColorStop(0, "#a5ed75"); g1.addColorStop(1, "#398f36");
  ctx.fillStyle = g1;
  ctx.beginPath(); ctx.arc(cx - 2, cy - 20, 19, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3b9a3d";
  ctx.beginPath(); ctx.ellipse(cx + 18, cy - 20, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#11391e";
  ctx.beginPath(); ctx.arc(cx - 7, cy - 25, 2.5, 0, Math.PI * 2); ctx.fill();
  // Head 2 (lower, offset)
  const g2 = ctx.createRadialGradient(cx - 4, cy - 2, 3, cx + 2, cy + 2, 17);
  g2.addColorStop(0, "#a5ed75"); g2.addColorStop(1, "#398f36");
  ctx.fillStyle = g2;
  ctx.beginPath(); ctx.arc(cx + 3, cy - 2, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3b9a3d";
  ctx.beginPath(); ctx.ellipse(cx + 19, cy - 2, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
}

function drawThreepeater(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Central thick stem
  ctx.strokeStyle = "#2d7d3a";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 24);
  ctx.lineTo(cx, cy - 8);
  ctx.stroke();
  // Branch left
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 2);
  ctx.lineTo(cx - 22, cy - 22);
  ctx.stroke();
  // Branch right
  ctx.beginPath();
  ctx.moveTo(cx, cy - 2);
  ctx.lineTo(cx + 22, cy - 22);
  ctx.stroke();
  // Leaves
  ctx.fillStyle = "#55b54b";
  ctx.beginPath(); ctx.ellipse(cx - 16, cy + 18, 16, 7, -0.35, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 12, cy + 18, 16, 7, 0.35, 0, Math.PI * 2); ctx.fill();
  // Center head
  const gc = ctx.createRadialGradient(cx - 4, cy - 20, 3, cx, cy - 14, 18);
  gc.addColorStop(0, "#a5ed75"); gc.addColorStop(1, "#398f36");
  ctx.fillStyle = gc;
  ctx.beginPath(); ctx.arc(cx, cy - 16, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3b9a3d"; ctx.beginPath(); ctx.ellipse(cx + 17, cy - 16, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Left head (smaller)
  ctx.fillStyle = "#55b54b";
  ctx.beginPath(); ctx.arc(cx - 22, cy - 26, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3b9a3d"; ctx.beginPath(); ctx.ellipse(cx - 9, cy - 26, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Right head (smaller)
  ctx.fillStyle = "#55b54b";
  ctx.beginPath(); ctx.arc(cx + 22, cy - 26, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3b9a3d"; ctx.beginPath(); ctx.ellipse(cx + 35, cy - 26, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
}

function drawSplitPea(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Stem
  ctx.strokeStyle = "#2d7d3a";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 24);
  ctx.quadraticCurveTo(cx - 4, cy + 4, cx, cy - 10);
  ctx.stroke();
  // Leaves
  ctx.fillStyle = "#55b54b";
  ctx.beginPath(); ctx.ellipse(cx - 16, cy + 18, 17, 7, -0.35, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 14, cy + 18, 17, 7, 0.35, 0, Math.PI * 2); ctx.fill();
  // Front head (facing right)
  const gf = ctx.createRadialGradient(cx - 4, cy - 22, 3, cx + 4, cy - 16, 22);
  gf.addColorStop(0, "#a5ed75"); gf.addColorStop(1, "#398f36");
  ctx.fillStyle = gf;
  ctx.beginPath(); ctx.arc(cx + 2, cy - 18, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3b9a3d"; ctx.beginPath(); ctx.ellipse(cx + 21, cy - 18, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#11391e"; ctx.beginPath(); ctx.arc(cx - 4, cy - 23, 2.5, 0, Math.PI * 2); ctx.fill();
  // Back head (facing left, different shade)
  ctx.fillStyle = "#3d8a30";
  ctx.beginPath(); ctx.arc(cx - 6, cy - 4, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2c6e24"; ctx.beginPath(); ctx.ellipse(cx - 21, cy - 4, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#11391e"; ctx.beginPath(); ctx.arc(cx + 2, cy - 7, 2, 0, Math.PI * 2); ctx.fill();
}

function drawChomper(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Stem
  ctx.strokeStyle = "#5e3475";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 26);
  ctx.lineTo(cx, cy - 4);
  ctx.stroke();
  // Leaves
  ctx.fillStyle = "#7a46a0";
  ctx.beginPath(); ctx.ellipse(cx - 18, cy + 16, 20, 8, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 16, cy + 16, 20, 8, 0.4, 0, Math.PI * 2); ctx.fill();
  // Lower jaw
  ctx.fillStyle = "#9d4ec0";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, 28, 16, 0, 0, Math.PI);
  ctx.fill();
  // Upper jaw (darker)
  ctx.fillStyle = "#7d3aa0";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6, 28, 16, 0, Math.PI, 0);
  ctx.fill();
  // Teeth (lower)
  ctx.fillStyle = "#f5f0c8";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 10 - 4, cy + 4);
    ctx.lineTo(cx + i * 10, cy - 4);
    ctx.lineTo(cx + i * 10 + 4, cy + 4);
    ctx.closePath();
    ctx.fill();
  }
  // Eyes
  ctx.fillStyle = "#ffffcc";
  ctx.beginPath(); ctx.arc(cx - 10, cy - 12, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 10, cy - 12, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a0030";
  ctx.beginPath(); ctx.arc(cx - 9, cy - 12, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 11, cy - 12, 3, 0, Math.PI * 2); ctx.fill();
}

function drawPotatoMine(ctx: CanvasRenderingContext2D, cx: number, cy: number, armed: boolean): void {
  // Dirt mound
  ctx.fillStyle = "#7a5c34";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 18, 28, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Potato body (half-buried)
  const pg = ctx.createRadialGradient(cx - 8, cy - 4, 4, cx, cy + 4, 26);
  pg.addColorStop(0, "#d9b47a");
  pg.addColorStop(1, "#9a6e3a");
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 22, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  if (armed) {
    // Eyes open (armed - ready to explode)
    ctx.fillStyle = "#ffe87a";
    ctx.beginPath(); ctx.arc(cx - 8, cy - 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 8, cy - 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a0a00";
    ctx.beginPath(); ctx.arc(cx - 7, cy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 9, cy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    // Furrowed brow (ready)
    ctx.strokeStyle = "#6a3a12";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 13, cy - 10); ctx.lineTo(cx - 5, cy - 7);
    ctx.moveTo(cx + 13, cy - 10); ctx.lineTo(cx + 5, cy - 7);
    ctx.stroke();
  } else {
    // Eyes closed (unarmed - sleeping)
    ctx.strokeStyle = "#6a3a12";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 1, 5, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 8, cy - 1, 5, 0, Math.PI);
    ctx.stroke();
    // "Zzz" if unarmed
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("z", cx + 18, cy - 16);
    ctx.textAlign = "left";
  }
}

function drawSpikeweed(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Ground strip
  ctx.fillStyle = "#2d5a1e";
  ctx.beginPath();
  ctx.roundRect(cx - 30, cy + 10, 60, 14, 5);
  ctx.fill();
  // Spikes
  ctx.fillStyle = "#6abf3a";
  for (let i = -3; i <= 3; i++) {
    const sx = cx + i * 9;
    ctx.beginPath();
    ctx.moveTo(sx - 5, cy + 10);
    ctx.lineTo(sx, cy - 12);
    ctx.lineTo(sx + 5, cy + 10);
    ctx.closePath();
    ctx.fill();
  }
  // Small leaves
  ctx.strokeStyle = "#3d7a22";
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    const sx = cx + i * 11 + 4;
    ctx.beginPath();
    ctx.moveTo(sx, cy + 8);
    ctx.quadraticCurveTo(sx + 8, cy - 2, sx + 14, cy + 4);
    ctx.stroke();
  }
}

function drawTangleKelp(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Water base bubble
  ctx.fillStyle = "rgba(42, 120, 160, 0.6)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 20, 26, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Kelp strands (wavy)
  ctx.strokeStyle = "#2a8c6e";
  ctx.lineWidth = 5;
  for (let i = -1; i <= 1; i++) {
    const sx = cx + i * 10;
    ctx.beginPath();
    ctx.moveTo(sx, cy + 16);
    ctx.bezierCurveTo(sx - 12, cy + 4, sx + 14, cy - 8, sx - 8, cy - 22);
    ctx.stroke();
  }
  ctx.strokeStyle = "#3db886";
  ctx.lineWidth = 3;
  for (let i = -1; i <= 1; i++) {
    const sx = cx + i * 10;
    ctx.beginPath();
    ctx.moveTo(sx, cy + 16);
    ctx.bezierCurveTo(sx + 10, cy + 6, sx - 12, cy - 6, sx + 6, cy - 20);
    ctx.stroke();
  }
  // Tip fronds
  ctx.fillStyle = "#4dd4a0";
  ctx.beginPath();
  ctx.ellipse(cx - 8, cy - 24, 10, 5, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 6, cy - 26, 10, 5, 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawSquash(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Legs
  ctx.fillStyle = "#3a7a26";
  ctx.beginPath(); ctx.roundRect(cx - 18, cy + 8, 12, 20, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 6, cy + 8, 12, 20, 4); ctx.fill();
  // Body
  const sg = ctx.createLinearGradient(cx - 28, cy - 18, cx + 28, cy + 18);
  sg.addColorStop(0, "#a5d44a");
  sg.addColorStop(1, "#5a9a22");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2, 28, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Face stripes (squash ridges)
  ctx.strokeStyle = "rgba(50, 100, 20, 0.38)";
  ctx.lineWidth = 3;
  for (const dx of [-10, 0, 10]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, cy - 22); ctx.lineTo(cx + dx, cy + 18);
    ctx.stroke();
  }
  // Eyes (angry)
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(cx - 9, cy - 8, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 9, cy - 8, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a0a00";
  ctx.beginPath(); ctx.arc(cx - 8, cy - 8, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 10, cy - 8, 4, 0, Math.PI * 2); ctx.fill();
  // Angry brows
  ctx.strokeStyle = "#2a4a10";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 15, cy - 18); ctx.lineTo(cx - 4, cy - 14);
  ctx.moveTo(cx + 15, cy - 18); ctx.lineTo(cx + 4, cy - 14);
  ctx.stroke();
}

function drawJalapeno(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Stem
  ctx.strokeStyle = "#2a6e1a";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 24);
  ctx.lineTo(cx, cy - 8);
  ctx.stroke();
  // Leaves
  ctx.fillStyle = "#3a8a28";
  ctx.beginPath(); ctx.ellipse(cx - 14, cy + 16, 16, 7, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 14, cy + 16, 16, 7, 0.4, 0, Math.PI * 2); ctx.fill();
  // Pepper cap (green)
  ctx.fillStyle = "#2f7e1a";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 14, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pepper body (red-orange gradient)
  const jg = ctx.createLinearGradient(cx - 14, cy - 8, cx + 14, cy + 20);
  jg.addColorStop(0, "#ff6b1a");
  jg.addColorStop(0.5, "#e83020");
  jg.addColorStop(1, "#c41a14");
  ctx.fillStyle = jg;
  ctx.beginPath();
  ctx.moveTo(cx - 13, cy - 8);
  ctx.bezierCurveTo(cx - 16, cy + 4, cx - 10, cy + 22, cx, cy + 26);
  ctx.bezierCurveTo(cx + 10, cy + 22, cx + 16, cy + 4, cx + 13, cy - 8);
  ctx.closePath();
  ctx.fill();
  // Highlight
  ctx.fillStyle = "rgba(255,200,150,0.36)";
  ctx.beginPath();
  ctx.ellipse(cx - 4, cy + 4, 5, 12, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Flame tip
  ctx.fillStyle = "#ff9922";
  ctx.beginPath();
  ctx.arc(cx + 2, cy + 28, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCactus(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Main trunk
  const cg = ctx.createLinearGradient(cx - 14, cy - 24, cx + 14, cy + 24);
  cg.addColorStop(0, "#6abf3a"); cg.addColorStop(1, "#3d7a22");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.roundRect(cx - 11, cy - 24, 22, 52, 8);
  ctx.fill();
  // Left arm
  ctx.beginPath();
  ctx.roundRect(cx - 28, cy - 4, 20, 12, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx - 30, cy - 20, 12, 20, 6);
  ctx.fill();
  // Right arm
  ctx.beginPath();
  ctx.roundRect(cx + 8, cy - 6, 20, 12, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx + 18, cy - 22, 12, 20, 6);
  ctx.fill();
  // Spines
  ctx.strokeStyle = "#ffe8a0";
  ctx.lineWidth = 2;
  for (const [sx, sy] of [[cx - 12, cy - 10], [cx + 12, cy - 10], [cx - 12, cy + 8], [cx + 12, cy + 8],
    [cx - 12, cy + 24], [cx + 12, cy + 24], [cx - 30, cy - 12], [cx + 30, cy - 14]] as [number, number][]) {
    ctx.beginPath();
    ctx.moveTo(sx, sy); ctx.lineTo(sx - (sx < cx ? 8 : -8), sy - 4); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx, sy); ctx.lineTo(sx - (sx < cx ? 8 : -8), sy + 4); ctx.stroke();
  }
  // Top flower
  ctx.fillStyle = "#ff6688";
  ctx.beginPath();
  ctx.arc(cx, cy - 26, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffee44";
  ctx.beginPath();
  ctx.arc(cx, cy - 26, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawTorchwood(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Tree log body
  const lg = ctx.createLinearGradient(cx - 22, cy - 20, cx + 22, cy + 28);
  lg.addColorStop(0, "#8a5a2e"); lg.addColorStop(1, "#5a3518");
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.roundRect(cx - 20, cy - 14, 40, 42, 10);
  ctx.fill();
  // Wood grain lines
  ctx.strokeStyle = "rgba(40, 20, 8, 0.4)";
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 8, cy - 14); ctx.lineTo(cx + i * 8, cy + 28);
    ctx.stroke();
  }
  // Knot
  ctx.strokeStyle = "rgba(40, 20, 8, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy + 6, 7, 5, 0.2, 0, Math.PI * 2);
  ctx.stroke();
  // Fire (3 flame shapes)
  for (const [fx, size, col] of [[cx - 8, 1.1, "#ff4400"], [cx + 2, 1.3, "#ff7700"], [cx + 10, 1.0, "#ffaa00"]] as [number, number, string][]) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(fx, cy - 14);
    ctx.bezierCurveTo(fx - 10 * size, cy - 24, fx - 6 * size, cy - 40, fx, cy - 48 * size + 10);
    ctx.bezierCurveTo(fx + 6 * size, cy - 40, fx + 10 * size, cy - 24, fx, cy - 14);
    ctx.fill();
  }
  ctx.fillStyle = "#ffe055";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18);
  ctx.bezierCurveTo(cx - 6, cy - 26, cx - 4, cy - 36, cx, cy - 42);
  ctx.bezierCurveTo(cx + 4, cy - 36, cx + 6, cy - 26, cx, cy - 18);
  ctx.fill();
}

function drawPlantern(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Glow aura
  const glow = ctx.createRadialGradient(cx, cy - 4, 4, cx, cy - 4, 38);
  glow.addColorStop(0, "rgba(255, 220, 80, 0.38)");
  glow.addColorStop(1, "rgba(255, 220, 80, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 38, 0, Math.PI * 2);
  ctx.fill();
  // Handle
  ctx.strokeStyle = "#8a6a22";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 28); ctx.lineTo(cx + 8, cy - 28);
  ctx.arc(cx, cy - 28, 8, 0, Math.PI, true);
  ctx.stroke();
  // Lantern body
  const planternLg = ctx.createLinearGradient(cx - 18, cy - 24, cx + 18, cy + 20);
  planternLg.addColorStop(0, "#f5c840"); planternLg.addColorStop(1, "#c88a18");
  ctx.fillStyle = planternLg;
  ctx.beginPath();
  ctx.roundRect(cx - 18, cy - 24, 36, 44, 8);
  ctx.fill();
  // Glass panels (bright)
  ctx.fillStyle = "rgba(255, 240, 120, 0.65)";
  ctx.beginPath();
  ctx.roundRect(cx - 13, cy - 18, 11, 32, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx + 2, cy - 18, 11, 32, 4);
  ctx.fill();
  // Top / bottom caps
  ctx.fillStyle = "#8a6a22";
  ctx.beginPath(); ctx.roundRect(cx - 20, cy - 26, 40, 6, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx - 20, cy + 18, 40, 6, 4); ctx.fill();
}

function drawBlover(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Stem
  ctx.strokeStyle = "#4a9a38";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 26);
  ctx.lineTo(cx, cy - 6);
  ctx.stroke();
  // Fluffy dandelion head — many small circles radiating outward
  ctx.fillStyle = "#e8e8e8";
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12;
    const r = 22;
    const bx = cx + Math.cos(a) * r;
    const by = cy - 12 + Math.sin(a) * r;
    // Stalk
    ctx.strokeStyle = "rgba(200, 200, 200, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(bx, by);
    ctx.stroke();
    // Puff
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Center
  ctx.fillStyle = "#c8d440";
  ctx.beginPath();
  ctx.arc(cx, cy - 10, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawUmbrellaLeaf(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Stem
  ctx.strokeStyle = "#3a7a22";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 26);
  ctx.lineTo(cx, cy - 6);
  ctx.stroke();
  // Umbrella leaf (large flat circle with scalloped edge)
  ctx.fillStyle = "#4aaf35";
  ctx.beginPath();
  ctx.arc(cx, cy - 14, 30, 0, Math.PI * 2);
  ctx.fill();
  // Scalloped edge
  ctx.fillStyle = "#3a9428";
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 28, cy - 14 + Math.sin(a) * 28, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Veins
  ctx.strokeStyle = "rgba(30, 90, 18, 0.4)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx + Math.cos(a) * 26, cy - 14 + Math.sin(a) * 26);
    ctx.stroke();
  }
  // Center dome (water repelling bump)
  ctx.fillStyle = "#66cc44";
  ctx.beginPath();
  ctx.arc(cx, cy - 14, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoffeeBean(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Bean body
  const bg = ctx.createRadialGradient(cx - 8, cy - 8, 3, cx, cy, 26);
  bg.addColorStop(0, "#6b3a1c"); bg.addColorStop(1, "#2e1408");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 22, 28, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Center crease
  ctx.strokeStyle = "rgba(10, 5, 2, 0.7)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy - 24);
  ctx.bezierCurveTo(cx - 8, cy - 8, cx + 8, cy + 8, cx + 2, cy + 24);
  ctx.stroke();
  // Steam lines
  ctx.strokeStyle = "rgba(220, 200, 180, 0.55)";
  ctx.lineWidth = 2;
  for (const dx of [-7, 0, 7]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, cy - 28);
    ctx.bezierCurveTo(cx + dx - 5, cy - 36, cx + dx + 5, cy - 44, cx + dx, cy - 52);
    ctx.stroke();
  }
  // Shine
  ctx.fillStyle = "rgba(180, 130, 80, 0.3)";
  ctx.beginPath();
  ctx.ellipse(cx - 6, cy - 8, 7, 12, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawMarigold(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Stem
  ctx.strokeStyle = "#3f8736";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 26);
  ctx.lineTo(cx, cy - 4);
  ctx.stroke();
  // Leaves
  ctx.fillStyle = "#4cad45";
  ctx.beginPath(); ctx.ellipse(cx - 14, cy + 14, 17, 7, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 14, cy + 14, 17, 7, 0.4, 0, Math.PI * 2); ctx.fill();
  // Petals (orange layered)
  for (let layer = 0; layer < 3; layer++) {
    const r = 18 - layer * 3;
    const count = 12 - layer;
    ctx.fillStyle = layer === 0 ? "#ff8c00" : layer === 1 ? "#ffa820" : "#ffcc44";
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + (layer * 0.3);
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r, cy - 14 + Math.sin(a) * r, 7, 12, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Center
  ctx.fillStyle = "#ff6600";
  ctx.beginPath(); ctx.arc(cx, cy - 14, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#cc3300";
  ctx.beginPath(); ctx.arc(cx, cy - 14, 5, 0, Math.PI * 2); ctx.fill();
}

function drawMagnetShroom(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Metallic mushroom
  ctx.fillStyle = "#6e7880";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10, 27, 18, 0, Math.PI, 0);
  ctx.fill();
  // U-shaped magnet on top
  ctx.strokeStyle = "#cc4444";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy - 10, 13, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = "#4444cc";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx - 13, cy - 10, 1, 0, Math.PI * 2); ctx.stroke();
  // Tips of magnet
  ctx.fillStyle = "#cc4444";
  ctx.beginPath(); ctx.roundRect(cx - 16, cy - 24, 7, 14, 3); ctx.fill();
  ctx.fillStyle = "#4444cc";
  ctx.beginPath(); ctx.roundRect(cx + 9, cy - 24, 7, 14, 3); ctx.fill();
  // Stem
  ctx.fillStyle = "#b0bec5";
  ctx.beginPath();
  ctx.roundRect(cx - 12, cy - 9, 24, 30, 10);
  ctx.fill();
}

export function renderPlantPreview(
  ctx: CanvasRenderingContext2D,
  plantType: string,
  cx: number,
  cy: number
): void {
  const pt = plantType;
  if (pt === "SUNFLOWER") drawSunflower(ctx, cx, cy);
  else if (pt === "MARIGOLD") drawMarigold(ctx, cx, cy);
  else if (pt === "WALL_NUT") drawWallNut(ctx, cx, cy);
  else if (pt === "TALL_NUT") drawWallNut(ctx, cx, cy, true);
  else if (pt === "PUMPKIN") drawPumpkin(ctx, cx, cy);
  else if (pt === "GARLIC") drawGarlic(ctx, cx, cy);
  else if (pt === "STARFRUIT") drawStarfruit(ctx, cx, cy);
  else if (pt === "SNOW_PEA") drawPeashooter(ctx, cx, cy, true);
  else if (pt === "CHERRY_BOMB") drawBomb(ctx, cx, cy);
  else if (pt === "JALAPENO") drawJalapeno(ctx, cx, cy);
  else if (pt === "REPEATER") drawRepeater(ctx, cx, cy);
  else if (pt === "THREEPEATER") drawThreepeater(ctx, cx, cy);
  else if (pt === "SPLIT_PEA") drawSplitPea(ctx, cx, cy);
  else if (pt === "CHOMPER") drawChomper(ctx, cx, cy);
  else if (pt === "POTATO_MINE") drawPotatoMine(ctx, cx, cy, false);
  else if (pt === "SPIKEWEED") drawSpikeweed(ctx, cx, cy);
  else if (pt === "TANGLE_KELP") drawTangleKelp(ctx, cx, cy);
  else if (pt === "SQUASH") drawSquash(ctx, cx, cy);
  else if (pt === "CACTUS") drawCactus(ctx, cx, cy);
  else if (pt === "TORCHWOOD") drawTorchwood(ctx, cx, cy);
  else if (pt === "PLANTERN") drawPlantern(ctx, cx, cy);
  else if (pt === "BLOVER") drawBlover(ctx, cx, cy);
  else if (pt === "UMBRELLA_LEAF") drawUmbrellaLeaf(ctx, cx, cy);
  else if (pt === "COFFEE_BEAN") drawCoffeeBean(ctx, cx, cy);
  else if (pt === "MAGNET_SHROOM") drawMagnetShroom(ctx, cx, cy);
  else if (pt === "LILY_PAD") {
    ctx.fillStyle = "#43a65a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 30, 17, -0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (pt === "FLOWER_POT") {
    ctx.fillStyle = "#a65b38";
    ctx.beginPath();
    ctx.roundRect(cx - 24, cy - 16, 48, 38, 7);
    ctx.fill();
    ctx.fillStyle = "#583022";
    ctx.fillRect(cx - 26, cy - 20, 52, 9);
  } else if (pt.includes("PULT")) {
    ctx.fillStyle = "#5aa84f";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#386f31";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy + 4);
    ctx.lineTo(cx + 24, cy - 22);
    ctx.stroke();
    ctx.fillStyle = pt === "MELON_PULT" ? "#74c85a" : pt === "KERNEL_PULT" ? "#f1c84e" : "#9bd05a";
    ctx.beginPath();
    ctx.arc(cx + 30, cy - 27, 13, 0, Math.PI * 2);
    ctx.fill();
  } else if (pt.includes("SHROOM")) {
    const shroomColors: Record<string, string> = {
      PUFF_SHROOM: "#a87ccd",
      SUN_SHROOM: "#d8a33c",
      FUME_SHROOM: "#4a8a1e",
      SCAREDY_SHROOM: "#d68faa",
      ICE_SHROOM: "#3bbcd6",
      DOOM_SHROOM: "#2a1a40",
      SEA_SHROOM: "#2e8c7a",
    };
    drawMushroom(ctx, cx, cy, shroomColors[pt] ?? "#8e67c7");
  } else {
    drawPeashooter(ctx, cx, cy);
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, plant: RuntimePlant, now: number): void {
  const cx = tileX(plant.col) + CELL_W / 2;
  const cy = tileY(plant.row) + CELL_H / 2 + 4;
  const healthPct = plant.maxHealth > 0 ? plant.health / plant.maxHealth : 0;

  ctx.save();

  // Per-plant sway animation
  const swayPhase = plant.col * 1.4 + plant.row * 0.8;
  const noSway = plant.plantType === "SPIKEWEED" || plant.plantType === "LILY_PAD" ||
    plant.plantType === "FLOWER_POT" || plant.plantType === "TANGLE_KELP";
  const swayAmp = noSway ? 0 : ["WALL_NUT", "TALL_NUT", "PUMPKIN"].includes(plant.plantType) ? 1 : 3;
  const swayX = Math.sin(now / 1200 + swayPhase) * swayAmp * 0.5;
  const swayY = Math.sin(now / 900 + swayPhase * 1.3) * swayAmp;
  ctx.translate(swayX, swayY);

  ctx.shadowColor = "rgba(0,0,0,0.26)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 5;

  const pt = plant.plantType;

  if (pt === "SUNFLOWER" || pt === "MARIGOLD") {
    if (pt === "MARIGOLD") drawMarigold(ctx, cx, cy);
    else drawSunflower(ctx, cx, cy);
  } else if (pt === "WALL_NUT") {
    drawWallNut(ctx, cx, cy);
  } else if (pt === "TALL_NUT") {
    drawWallNut(ctx, cx, cy, true);
  } else if (pt === "PUMPKIN") {
    drawPumpkin(ctx, cx, cy);
  } else if (pt === "GARLIC") {
    drawGarlic(ctx, cx, cy);
  } else if (pt === "STARFRUIT") {
    drawStarfruit(ctx, cx, cy);
  } else if (pt === "SNOW_PEA") {
    drawPeashooter(ctx, cx, cy, true);
  } else if (pt === "CHERRY_BOMB" || pt === "JALAPENO") {
    if (pt === "JALAPENO") drawJalapeno(ctx, cx, cy);
    else drawBomb(ctx, cx, cy);
  } else if (pt === "REPEATER") {
    drawRepeater(ctx, cx, cy);
  } else if (pt === "THREEPEATER") {
    drawThreepeater(ctx, cx, cy);
  } else if (pt === "SPLIT_PEA") {
    drawSplitPea(ctx, cx, cy);
  } else if (pt === "CHOMPER") {
    drawChomper(ctx, cx, cy);
  } else if (pt === "POTATO_MINE") {
    const armed = (plant as { armedAtMs?: number | null }).armedAtMs != null && Date.now() >= ((plant as { armedAtMs?: number | null }).armedAtMs as number);
    drawPotatoMine(ctx, cx, cy, armed);
  } else if (pt === "SPIKEWEED") {
    drawSpikeweed(ctx, cx, cy);
  } else if (pt === "TANGLE_KELP") {
    drawTangleKelp(ctx, cx, cy);
  } else if (pt === "SQUASH") {
    drawSquash(ctx, cx, cy);
  } else if (pt === "CACTUS") {
    drawCactus(ctx, cx, cy);
  } else if (pt === "TORCHWOOD") {
    drawTorchwood(ctx, cx, cy);
  } else if (pt === "PLANTERN") {
    drawPlantern(ctx, cx, cy);
  } else if (pt === "BLOVER") {
    drawBlover(ctx, cx, cy);
  } else if (pt === "UMBRELLA_LEAF") {
    drawUmbrellaLeaf(ctx, cx, cy);
  } else if (pt === "COFFEE_BEAN") {
    drawCoffeeBean(ctx, cx, cy);
  } else if (pt === "MAGNET_SHROOM") {
    drawMagnetShroom(ctx, cx, cy);
  } else if (pt.includes("SHROOM")) {
    const shroomColors: Record<string, string> = {
      PUFF_SHROOM: "#a87ccd",
      SUN_SHROOM: "#d8a33c",
      FUME_SHROOM: "#4a8a1e",
      SCAREDY_SHROOM: "#d68faa",
      ICE_SHROOM: "#3bbcd6",
      DOOM_SHROOM: "#2a1a40",
      SEA_SHROOM: "#2e8c7a",
    };
    drawMushroom(ctx, cx, cy, shroomColors[pt] ?? "#8e67c7");
  } else if (pt === "LILY_PAD") {
    ctx.fillStyle = "#43a65a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 30, 17, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(35, 102, 54, 0.9)";
    ctx.beginPath();
    ctx.moveTo(cx, cy + 4);
    ctx.lineTo(cx + 22, cy - 5);
    ctx.lineTo(cx + 13, cy + 12);
    ctx.closePath();
    ctx.fill();
  } else if (pt === "FLOWER_POT") {
    ctx.fillStyle = "#a65b38";
    ctx.beginPath();
    ctx.roundRect(cx - 24, cy - 16, 48, 38, 7);
    ctx.fill();
    ctx.fillStyle = "#583022";
    ctx.fillRect(cx - 26, cy - 20, 52, 9);
  } else if (pt.includes("PULT")) {
    ctx.fillStyle = "#5aa84f";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#386f31";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy + 4);
    ctx.lineTo(cx + 24, cy - 22);
    ctx.stroke();
    ctx.fillStyle = pt === "MELON_PULT" ? "#74c85a" : pt === "KERNEL_PULT" ? "#f1c84e" : "#9bd05a";
    ctx.beginPath();
    ctx.arc(cx + 30, cy - 27, 13, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // PEASHOOTER and any unrecognized type
    drawPeashooter(ctx, cx, cy);
  }

  ctx.restore();
  drawHealthBar(ctx, cx - 26, tileY(plant.row) + 7, 52, healthPct, "#5ee84e");
}

function getPlantRenderPriority(plant: RuntimePlant): number {
  if (plant.plantType === "LILY_PAD" || plant.plantType === "FLOWER_POT") return 0;
  if (plant.plantType === "PUMPKIN") return 2;
  return 1;
}

function drawZombie(ctx: CanvasRenderingContext2D, zombie: RuntimeZombie, gridRows: number, gridCols: number): void {
  const px = HOUSE_W + zombie.x * CELL_W;
  const py = tileY(zombie.lane);
  if (px + CELL_W < 0 || px > canvasW(gridCols) || py > TOP_PAD + boardH(gridRows)) return;

  const cx = px + CELL_W / 2;
  const ground = py + CELL_H * 0.74;
  const healthPct = zombie.maxHealth > 0 ? zombie.health / zombie.maxHealth : 0;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 5;

  if (zombie.isUnderground) {
    ctx.fillStyle = "#6b4d2f";
    ctx.beginPath();
    ctx.ellipse(cx, ground - 2, 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a6a43";
    ctx.beginPath();
    ctx.ellipse(cx + 8, ground - 10, 22, 8, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a3d25";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 10, ground - 22);
    ctx.lineTo(cx + 18, ground - 43);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.strokeStyle = zombie.isFrozen ? "#6aaeca" : "#5a6f57";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx - 4, ground - 8);
  ctx.lineTo(cx - 19, ground + 14);
  ctx.moveTo(cx + 5, ground - 8);
  ctx.lineTo(cx + 18, ground + 14);
  ctx.stroke();

  ctx.fillStyle = zombie.isFrozen ? "#89cce2" : "#6f8468";
  ctx.beginPath();
  ctx.ellipse(cx, ground - 35, 20, 28, -0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = zombie.isFrozen ? "#bceeff" : "#9fae88";
  ctx.beginPath();
  ctx.arc(cx - 1, ground - 68, 21, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = zombie.isFrozen ? "#75b9d1" : "#7b8c69";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx - 16, ground - 42);
  ctx.lineTo(cx - 38, ground - 31);
  ctx.moveTo(cx + 13, ground - 43);
  ctx.lineTo(cx + 37, ground - 34);
  ctx.stroke();

  ctx.fillStyle = "#1f251c";
  ctx.beginPath();
  ctx.arc(cx - 8, ground - 73, 2.5, 0, Math.PI * 2);
  ctx.arc(cx + 7, ground - 72, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4a322f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 5, ground - 59);
  ctx.lineTo(cx + 9, ground - 58);
  ctx.stroke();

  if (zombie.zombieType === "CONEHEAD") {
    ctx.fillStyle = "#f07423";
    ctx.beginPath();
    ctx.moveTo(cx - 17, ground - 86);
    ctx.lineTo(cx + 15, ground - 86);
    ctx.lineTo(cx, ground - 124);
    ctx.closePath();
    ctx.fill();
  } else if (zombie.zombieType === "BUCKETHEAD") {
    ctx.fillStyle = "#b9c1c3";
    ctx.beginPath();
    ctx.roundRect(cx - 19, ground - 99, 38, 24, 6);
    ctx.fill();
  } else if (zombie.armorHealth > 0) {
    ctx.strokeStyle = "#d3d4cc";
    ctx.lineWidth = 4;
    ctx.strokeRect(cx - 18, ground - 61, 36, 42);
  }

  if (zombie.zombieType === "POGO" && zombie.pogoStickActive !== false) {
    ctx.strokeStyle = "#343a3a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx + 24, ground - 42);
    ctx.lineTo(cx + 31, ground + 19);
    ctx.stroke();
    ctx.strokeStyle = "#b7c2c1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 18, ground + 19);
    ctx.lineTo(cx + 44, ground + 19);
    ctx.stroke();
  }

  ctx.restore();
  drawHealthBar(ctx, cx - 28, py + 8, 56, healthPct, "#ff685f");
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: RuntimeProjectile): void {
  const px = HOUSE_W + proj.x * CELL_W;
  const py = tileY(proj.lane) + CELL_H * 0.47 - proj.y * CELL_H * 0.42;
  const color = PROJECTILE_COLORS[proj.projectileType] ?? PROJECTILE_COLORS.default;

  ctx.fillStyle = color;
  if (proj.projectileType === "CABBAGE" || proj.projectileType === "MELON") {
    ctx.beginPath();
    ctx.ellipse(px, py, 11, 9, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (proj.projectileType === "BUTTER") {
    ctx.beginPath();
    ctx.roundRect(px - 10, py - 7, 20, 14, 4);
    ctx.fill();
    ctx.strokeStyle = "#f3c953";
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (proj.projectileType === "STAR") {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 12 : 5;
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
      const x = px + Math.cos(a) * r;
      const y = py + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.32;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px, py, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawSunDrop(ctx: CanvasRenderingContext2D, drop: RuntimeSunDrop): void {
  const px = HOUSE_W + drop.x * CELL_W + CELL_W / 2;
  const py = TOP_PAD + drop.y * CELL_H + CELL_H / 2;
  const radius = drop.state === "landed" ? 18 : 14;

  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = "rgba(255, 225, 78, 0.28)";
  ctx.beginPath();
  ctx.arc(0, 0, radius + 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd84d";
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (radius + 1), Math.sin(a) * (radius + 1));
    ctx.lineTo(Math.cos(a + 0.12) * (radius + 9), Math.sin(a + 0.12) * (radius + 9));
    ctx.lineTo(Math.cos(a - 0.12) * (radius + 9), Math.sin(a - 0.12) * (radius + 9));
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#ffe56a";
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFogOverlay(ctx: CanvasRenderingContext2D, grid: RuntimeGridCell[][], gridRows: number, gridCols: number): void {
  if (!grid.flat().some((cell) => cell.isFog)) return;

  for (const cell of grid.flat()) {
    if (!cell.isFog) continue;
    const x = tileX(cell.col);
    const y = tileY(cell.row);
    const opacity = cell.col <= FOG_START_COL ? 0.38 : Math.min(0.88, 0.5 + (cell.col - FOG_START_COL) * 0.12);
    ctx.fillStyle = `rgba(220, 230, 210, ${opacity})`;
    ctx.fillRect(x, y, CELL_W, CELL_H);
  }

  ctx.fillStyle = "rgba(255,255,255,0.16)";
  for (let i = 0; i < 10; i++) {
    const x = tileX(FOG_START_COL) + 26 + i * 74;
    const y = TOP_PAD + 26 + (i % 4) * 71;
    if (x > canvasW(gridCols) || y > TOP_PAD + boardH(gridRows)) continue;
    ctx.beginPath();
    ctx.ellipse(x, y, 76, 18, 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

interface GameCanvasProps {
  onCellClick?: (col: number, row: number) => void;
  shovelMode?: boolean;
}

export function GameCanvas({ onCellClick, shovelMode = false }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const effectsRef = useRef<CanvasEffect[]>([]);
  const prevPlantsRef = useRef<Map<string, { type: string; cx: number; cy: number }>>(new Map());
  const prevZombieHealthRef = useRef<Map<string, number>>(new Map());

  const status = useGameStore((s) => s.status);
  const environment = useGameStore((s) => s.environment);

  const width = canvasW(environment.gridCols);
  const height = canvasH(environment.gridRows);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function render() {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const state = useGameStore.getState();
      const { environment: env, plants, zombies, projectiles, sunDrops, lawnMowers } = state;

      const now = performance.now();

      // Detect instant-use plant removals → explosion effects
      const currentPlants = new Map<string, { type: string; cx: number; cy: number }>();
      for (const [id, plant] of Object.entries(state.plants)) {
        currentPlants.set(id, {
          type: plant.plantType,
          cx: tileX(plant.col) + CELL_W / 2,
          cy: tileY(plant.row) + CELL_H / 2 + 4,
        });
      }
      for (const [id, info] of prevPlantsRef.current) {
        if (!currentPlants.has(id) && INSTANT_PLANT_COLORS[info.type]) {
          effectsRef.current.push({
            type: "explosion",
            x: info.cx,
            y: info.cy,
            radius: info.type === "DOOM_SHROOM" ? 130 : info.type === "JALAPENO" ? 160 : 90,
            color: INSTANT_PLANT_COLORS[info.type],
            startMs: now,
            durationMs: info.type === "DOOM_SHROOM" ? 800 : 500,
          });
        }
      }
      prevPlantsRef.current = currentPlants;

      // Detect zombie damage → hit-flash effects
      for (const [id, zombie] of Object.entries(state.zombies)) {
        const prevHp = prevZombieHealthRef.current.get(id) ?? zombie.maxHealth;
        if (zombie.health < prevHp - 8) {
          effectsRef.current.push({
            type: "hit-flash",
            x: HOUSE_W + zombie.x * CELL_W + CELL_W / 2,
            y: tileY(zombie.lane) + CELL_H * 0.42,
            radius: 22,
            color: "rgba(255, 80, 60, 0.75)",
            startMs: now,
            durationMs: 200,
          });
        }
        prevZombieHealthRef.current.set(id, zombie.health);
      }
      for (const id of prevZombieHealthRef.current.keys()) {
        if (!state.zombies[id]) prevZombieHealthRef.current.delete(id);
      }
      // Expire old effects
      effectsRef.current = effectsRef.current.filter(e => now - e.startMs < e.durationMs);

      drawSceneBackdrop(ctx, env.type, env.gridRows, env.gridCols);
      drawBoard(ctx, env.type, env.gridRows, env.gridCols, env.waterLaneIndices, state.grid);

      for (const mower of Object.values(lawnMowers)) {
        drawLawnMower(ctx, mower);
      }

      const renderedPlants = Object.values(plants).sort(
        (a, b) => getPlantRenderPriority(a) - getPlantRenderPriority(b)
      );
      for (const plant of renderedPlants) {
        drawPlant(ctx, plant, now);
      }

      for (const zombie of Object.values(zombies)) {
        drawZombie(ctx, zombie, env.gridRows, env.gridCols);
      }

      for (const proj of Object.values(projectiles)) {
        drawProjectile(ctx, proj);
      }

      if (env.fogEnabled) {
        drawFogOverlay(ctx, state.grid, env.gridRows, env.gridCols);
      }

      // Draw visual effects
      for (const effect of effectsRef.current) {
        const progress = (now - effect.startMs) / effect.durationMs;
        if (progress >= 1 || progress < 0) continue;
        ctx.save();
        if (effect.type === "explosion") {
          const r = effect.radius * Math.pow(progress, 0.45);
          ctx.globalAlpha = (1 - progress) * 0.82;
          ctx.fillStyle = effect.color;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = (1 - progress) * 0.45;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, r * 0.38, 0, Math.PI * 2);
          ctx.fill();
        } else if (effect.type === "hit-flash") {
          ctx.globalAlpha = (1 - progress) * 0.7;
          ctx.fillStyle = effect.color;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.radius * (0.5 + progress * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      for (const drop of Object.values(sunDrops)) {
        if (drop.state !== "collected") {
          drawSunDrop(ctx, drop);
        }
      }

      const currentStatus = state.status;
      if (currentStatus === "game-over" || currentStatus === "victory") {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = currentStatus === "victory" ? "#ffd84d" : "#ff5547";
        ctx.font = "bold 52px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          currentStatus === "victory" ? "YOU WIN!" : "GAME OVER",
          canvas.width / 2,
          canvas.height / 2,
        );
        ctx.textBaseline = "alphabetic";
        return;
      }

      rafRef.current = requestAnimationFrame(render);
    }

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
  }, [status, width, height]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onCellClick) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor((x - HOUSE_W) / CELL_W);
    const row = Math.floor((y - TOP_PAD) / CELL_H);
    if (col < 0 || col >= environment.gridCols || row < 0 || row >= environment.gridRows) return;
    onCellClick(col, row);
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      style={{
        display: "block",
        width: "min(100%, 1080px)",
        height: "auto",
        cursor: shovelMode ? "pointer" : "crosshair",
        borderRadius: "8px",
      }}
    />
  );
}
