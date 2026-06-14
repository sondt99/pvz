import type { EnvironmentConfig, RuntimeGridCell } from "./types";
import { FOG_START_COL } from "./constants";

/**
 * Generate a fresh empty grid for the given environment.
 * Water, fog, and slope flags derive from the environment config.
 */
export function generateGrid(env: EnvironmentConfig): RuntimeGridCell[][] {
  const grid: RuntimeGridCell[][] = [];
  for (let row = 0; row < env.gridRows; row++) {
    const gridRow: RuntimeGridCell[] = [];
    for (let col = 0; col < env.gridCols; col++) {
      gridRow.push({
        row,
        col,
        isWater: env.waterLaneIndices.includes(row),
        isFog: env.fogEnabled && col >= FOG_START_COL,
        isSlope: env.slopeEnabled,
        plantInstanceId: null,
        lilyPadInstanceId: null,
        flowerPotInstanceId: null,
        graveId: null,
      });
    }
    grid.push(gridRow);
  }
  return grid;
}

export function getCell(
  grid: RuntimeGridCell[][],
  row: number,
  col: number
): RuntimeGridCell | null {
  const gridRow = grid[row];
  if (!gridRow) return null;
  return gridRow[col] ?? null;
}

export function getCellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function isWaterCell(
  grid: RuntimeGridCell[][],
  row: number,
  col: number
): boolean {
  return getCell(grid, row, col)?.isWater ?? false;
}

export function isFogCell(
  grid: RuntimeGridCell[][],
  row: number,
  col: number
): boolean {
  return getCell(grid, row, col)?.isFog ?? false;
}

/**
 * Whether a plant with the given placement requirements can go at (row, col).
 */
export function canPlantHere(
  grid: RuntimeGridCell[][],
  row: number,
  col: number,
  opts: {
    isAquatic: boolean;
    requiresLilyPad: boolean;
    requiresFlowerPot: boolean;
  }
): boolean {
  const cell = getCell(grid, row, col);
  if (!cell) return false;

  if (cell.isWater) {
    if (opts.isAquatic) {
      return cell.lilyPadInstanceId === null && cell.plantInstanceId === null;
    }
    if (opts.requiresLilyPad) {
      return cell.lilyPadInstanceId !== null && cell.plantInstanceId === null;
    }
    return false;
  }

  if (cell.isSlope) {
    if (!opts.requiresFlowerPot) return false;
    return cell.flowerPotInstanceId !== null && cell.plantInstanceId === null;
  }

  return cell.plantInstanceId === null;
}

export function getRow(
  grid: RuntimeGridCell[][],
  row: number
): RuntimeGridCell[] {
  return grid[row] ?? [];
}

export function setPlantOnCell(
  grid: RuntimeGridCell[][],
  row: number,
  col: number,
  instanceId: string | null
): void {
  const cell = getCell(grid, row, col);
  if (cell) cell.plantInstanceId = instanceId;
}

export function setLilyPadOnCell(
  grid: RuntimeGridCell[][],
  row: number,
  col: number,
  instanceId: string | null
): void {
  const cell = getCell(grid, row, col);
  if (cell) cell.lilyPadInstanceId = instanceId;
}

export function setFlowerPotOnCell(
  grid: RuntimeGridCell[][],
  row: number,
  col: number,
  instanceId: string | null
): void {
  const cell = getCell(grid, row, col);
  if (cell) cell.flowerPotInstanceId = instanceId;
}

/**
 * Column of the rightmost occupied plant in a lane, or null if empty.
 */
export function getEastmostPlantCol(
  grid: RuntimeGridCell[][],
  lane: number
): number | null {
  const row = getRow(grid, lane);
  for (let col = row.length - 1; col >= 0; col--) {
    if (row[col]?.plantInstanceId !== null) return col;
  }
  return null;
}
