"use client";

import { useEffect, useRef } from "react";
import { FOG_START_COL, TILE_H, TILE_W } from "@/engine/constants";
import { useGameStore } from "@/store/game-store";
import type {
  EnvironmentType,
  RuntimePlant,
  RuntimeProjectile,
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
  MELON: "#76cb62",
  STAR: "#ffe066",
  SPIKE: "#d0f0a0",
  default: "#ffffff",
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

  if (envType === "NIGHT") {
    drawGraves(ctx, gridRows, gridCols);
  }
}

function drawGraves(ctx: CanvasRenderingContext2D, gridRows: number, gridCols: number): void {
  const graveRows = gridRows === 5 ? [0, 2, 4] : [1, 3, 5];
  const graveCols = [gridCols - 4, gridCols - 3, gridCols - 2];
  for (let i = 0; i < graveRows.length; i++) {
    const row = graveRows[i];
    const col = graveCols[i % graveCols.length];
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

function drawPlant(ctx: CanvasRenderingContext2D, plant: RuntimePlant): void {
  const cx = tileX(plant.col) + CELL_W / 2;
  const cy = tileY(plant.row) + CELL_H / 2 + 4;
  const healthPct = plant.maxHealth > 0 ? plant.health / plant.maxHealth : 0;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.26)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 5;

  if (plant.plantType === "SUNFLOWER") drawSunflower(ctx, cx, cy);
  else if (plant.plantType === "WALL_NUT") drawWallNut(ctx, cx, cy);
  else if (plant.plantType === "TALL_NUT") drawWallNut(ctx, cx, cy, true);
  else if (plant.plantType === "SNOW_PEA") drawPeashooter(ctx, cx, cy, true);
  else if (plant.plantType === "CHERRY_BOMB") drawBomb(ctx, cx, cy);
  else if (plant.plantType.includes("SHROOM")) drawMushroom(ctx, cx, cy, plant.plantType === "SUN_SHROOM" ? "#d8a33c" : "#8e67c7");
  else if (plant.plantType === "LILY_PAD") {
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
  } else if (plant.plantType === "FLOWER_POT") {
    ctx.fillStyle = "#a65b38";
    ctx.beginPath();
    ctx.roundRect(cx - 24, cy - 16, 48, 38, 7);
    ctx.fill();
    ctx.fillStyle = "#583022";
    ctx.fillRect(cx - 26, cy - 20, 52, 9);
  } else if (plant.plantType.includes("PULT")) {
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
    ctx.fillStyle = plant.plantType === "MELON_PULT" ? "#74c85a" : plant.plantType === "KERNEL_PULT" ? "#f1c84e" : "#9bd05a";
    ctx.beginPath();
    ctx.arc(cx + 30, cy - 27, 13, 0, Math.PI * 2);
    ctx.fill();
  } else {
    drawPeashooter(ctx, cx, cy);
  }

  ctx.restore();
  drawHealthBar(ctx, cx - 26, tileY(plant.row) + 7, 52, healthPct, "#5ee84e");
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

function drawFogOverlay(ctx: CanvasRenderingContext2D, gridRows: number, gridCols: number): void {
  const startX = tileX(FOG_START_COL) - 28;
  const fog = ctx.createLinearGradient(startX, 0, canvasW(gridCols), 0);
  fog.addColorStop(0, "rgba(205, 220, 190, 0.1)");
  fog.addColorStop(0.35, "rgba(204, 220, 194, 0.62)");
  fog.addColorStop(1, "rgba(226, 234, 219, 0.88)");
  ctx.fillStyle = fog;
  ctx.fillRect(startX, TOP_PAD, canvasW(gridCols) - startX, boardH(gridRows));

  ctx.fillStyle = "rgba(255,255,255,0.16)";
  for (let i = 0; i < 10; i++) {
    const x = startX + 26 + i * 74;
    const y = TOP_PAD + 26 + (i % 4) * 71;
    ctx.beginPath();
    ctx.ellipse(x, y, 76, 18, 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

interface GameCanvasProps {
  onCellClick?: (col: number, row: number) => void;
}

export function GameCanvas({ onCellClick }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

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
      const { environment: env, plants, zombies, projectiles, sunDrops } = state;

      drawSceneBackdrop(ctx, env.type, env.gridRows, env.gridCols);
      drawBoard(ctx, env.type, env.gridRows, env.gridCols, env.waterLaneIndices);

      for (const plant of Object.values(plants)) {
        drawPlant(ctx, plant);
      }

      for (const zombie of Object.values(zombies)) {
        drawZombie(ctx, zombie, env.gridRows, env.gridCols);
      }

      for (const proj of Object.values(projectiles)) {
        drawProjectile(ctx, proj);
      }

      if (env.fogEnabled) {
        drawFogOverlay(ctx, env.gridRows, env.gridCols);
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
        cursor: "crosshair",
        borderRadius: "8px",
      }}
    />
  );
}
