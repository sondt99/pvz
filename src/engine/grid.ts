import type { EnvironmentConfig, RuntimeGridCell } from "./types";
import { FOG_START_COL } from "./constants";

export interface GraveCell {
  row: number;
  col: number;
  graveId: string;
}

export function getDefaultGraveCells(env: EnvironmentConfig): GraveCell[] {
  if (!env.gravesEnabled) return [];

  const rows = env.gridRows === 5 ? [0, 2, 4] : [1, 3, 5];
  const cols = [env.gridCols - 4, env.gridCols - 3, env.gridCols - 2];
  return rows
    .filter((row) => row >= 0 && row < env.gridRows)
    .map((row, index) => {
      const col = cols[index % cols.length];
      return { row, col, graveId: `grave-${row}-${col}` };
    })
    .filter((grave) => grave.col >= 0 && grave.col < env.gridCols);
}

/**
 * Generate a fresh empty grid for the given environment.
 * Water, fog, and slope flags derive from the environment config.
 */
export function generateGrid(env: EnvironmentConfig): RuntimeGridCell[][] {
  const grid: RuntimeGridCell[][] = [];
  const graveByCell = new Map(
    getDefaultGraveCells(env).map((grave) => [`${grave.row}:${grave.col}`, grave.graveId])
  );

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
        graveId: graveByCell.get(`${row}:${col}`) ?? null,
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
    isLilyPad?: boolean;
    isFlowerPot?: boolean;
  }
): boolean {
  const cell = getCell(grid, row, col);
  if (!cell) return false;
  if (cell.graveId !== null) return false;

  if (cell.isWater) {
    if (opts.isFlowerPot) return false;
    if (opts.isLilyPad) {
      return cell.lilyPadInstanceId === null && cell.plantInstanceId === null;
    }
    if (opts.isAquatic) {
      return cell.lilyPadInstanceId === null && cell.plantInstanceId === null;
    }
    if (opts.requiresLilyPad || !opts.isAquatic) {
      return cell.lilyPadInstanceId !== null && cell.plantInstanceId === null;
    }
    return false;
  }

  if (opts.isLilyPad) return false;
  if (opts.requiresLilyPad) return false;

  if (cell.isSlope) {
    if (opts.isFlowerPot) {
      return cell.flowerPotInstanceId === null && cell.plantInstanceId === null;
    }
    if (!opts.requiresFlowerPot) return false;
    return cell.flowerPotInstanceId !== null && cell.plantInstanceId === null;
  }

  if (opts.isFlowerPot) return false;
  if (opts.isAquatic) return false;
  if (opts.requiresFlowerPot) return false;
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
