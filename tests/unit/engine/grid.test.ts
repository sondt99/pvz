import { describe, it, expect } from "vitest";
import {
  generateGrid,
  getDefaultGraveCells,
  getCell,
  getCellKey,
  isWaterCell,
  isFogCell,
  canPlantHere,
  getRow,
  setPlantOnCell,
  setLilyPadOnCell,
  setFlowerPotOnCell,
  getEastmostPlantCol,
} from "@/engine/grid";
import type { EnvironmentConfig } from "@/engine/types";
import { FOG_START_COL } from "@/engine/constants";

const DAY_ENV: EnvironmentConfig = {
  type: "DAY",
  gridRows: 5,
  gridCols: 9,
  waterLaneIndices: [],
  gravesEnabled: false,
  fogEnabled: false,
  slopeEnabled: false,
  conveyorBelt: false,
  skyDropSun: true,
};

const POOL_ENV: EnvironmentConfig = {
  type: "POOL",
  gridRows: 6,
  gridCols: 9,
  waterLaneIndices: [2, 3],
  gravesEnabled: false,
  fogEnabled: false,
  slopeEnabled: false,
  conveyorBelt: false,
  skyDropSun: true,
};

const FOG_ENV: EnvironmentConfig = {
  type: "FOG",
  gridRows: 6,
  gridCols: 9,
  waterLaneIndices: [2, 3],
  gravesEnabled: false,
  fogEnabled: true,
  slopeEnabled: false,
  conveyorBelt: false,
  skyDropSun: true,
};

const ROOF_ENV: EnvironmentConfig = {
  type: "ROOF",
  gridRows: 5,
  gridCols: 9,
  waterLaneIndices: [],
  gravesEnabled: false,
  fogEnabled: false,
  slopeEnabled: true,
  conveyorBelt: false,
  skyDropSun: false,
};

describe("generateGrid", () => {
  it("creates the correct number of rows and cols for DAY", () => {
    const grid = generateGrid(DAY_ENV);
    expect(grid).toHaveLength(5);
    expect(grid[0]).toHaveLength(9);
  });

  it("creates 6-row grid for POOL", () => {
    const grid = generateGrid(POOL_ENV);
    expect(grid).toHaveLength(6);
  });

  it("marks rows 2 and 3 as water in POOL environment", () => {
    const grid = generateGrid(POOL_ENV);
    expect(grid[2][0].isWater).toBe(true);
    expect(grid[3][4].isWater).toBe(true);
    expect(grid[0][0].isWater).toBe(false);
    expect(grid[1][0].isWater).toBe(false);
    expect(grid[4][0].isWater).toBe(false);
  });

  it("marks no cells as water in DAY environment", () => {
    const grid = generateGrid(DAY_ENV);
    const hasWater = grid.flat().some((c) => c.isWater);
    expect(hasWater).toBe(false);
  });

  it("marks columns >= FOG_START_COL as fog when fogEnabled", () => {
    const grid = generateGrid(FOG_ENV);
    // Columns before FOG_START_COL must not be fogged
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < FOG_START_COL; col++) {
        expect(grid[row][col].isFog).toBe(false);
      }
    }
    // Columns at and after FOG_START_COL must be fogged
    for (let row = 0; row < 6; row++) {
      for (let col = FOG_START_COL; col < 9; col++) {
        expect(grid[row][col].isFog).toBe(true);
      }
    }
  });

  it("marks no cell as fog when fogEnabled is false", () => {
    const grid = generateGrid(POOL_ENV);
    expect(grid.flat().some((c) => c.isFog)).toBe(false);
  });

  it("marks all cells as slope in ROOF environment", () => {
    const grid = generateGrid(ROOF_ENV);
    expect(grid.flat().every((c) => c.isSlope)).toBe(true);
  });

  it("marks default grave cells when graves are enabled", () => {
    const nightEnv: EnvironmentConfig = { ...DAY_ENV, type: "NIGHT", gravesEnabled: true, skyDropSun: false };
    const grid = generateGrid(nightEnv);
    const graves = getDefaultGraveCells(nightEnv);

    expect(graves).toHaveLength(3);
    for (const grave of graves) {
      expect(grid[grave.row][grave.col].graveId).toBe(grave.graveId);
    }
  });

  it("all cells start with null plant / lilyPad / flowerPot / grave slots", () => {
    const grid = generateGrid(DAY_ENV);
    for (const cell of grid.flat()) {
      expect(cell.plantInstanceId).toBeNull();
      expect(cell.lilyPadInstanceId).toBeNull();
      expect(cell.flowerPotInstanceId).toBeNull();
      expect(cell.graveId).toBeNull();
    }
  });

  it("row and col properties match position in the grid", () => {
    const grid = generateGrid(DAY_ENV);
    expect(grid[3][7].row).toBe(3);
    expect(grid[3][7].col).toBe(7);
  });
});

describe("getCell", () => {
  it("returns the correct cell", () => {
    const grid = generateGrid(DAY_ENV);
    const cell = getCell(grid, 2, 4);
    expect(cell).not.toBeNull();
    expect(cell!.row).toBe(2);
    expect(cell!.col).toBe(4);
  });

  it("returns null for out-of-bounds row", () => {
    expect(getCell(generateGrid(DAY_ENV), -1, 0)).toBeNull();
    expect(getCell(generateGrid(DAY_ENV), 5, 0)).toBeNull();
  });

  it("returns null for out-of-bounds col", () => {
    expect(getCell(generateGrid(DAY_ENV), 0, -1)).toBeNull();
    expect(getCell(generateGrid(DAY_ENV), 0, 9)).toBeNull();
  });
});

describe("getCellKey", () => {
  it("returns a stable string key", () => {
    expect(getCellKey(0, 0)).toBe("0:0");
    expect(getCellKey(4, 8)).toBe("4:8");
    expect(getCellKey(2, 3)).toBe("2:3");
  });
});

describe("isWaterCell / isFogCell helpers", () => {
  it("isWaterCell returns true for water lanes", () => {
    const grid = generateGrid(POOL_ENV);
    expect(isWaterCell(grid, 2, 0)).toBe(true);
    expect(isWaterCell(grid, 0, 0)).toBe(false);
  });

  it("isFogCell returns true for fog columns", () => {
    const grid = generateGrid(FOG_ENV);
    expect(isFogCell(grid, 0, FOG_START_COL)).toBe(true);
    expect(isFogCell(grid, 0, FOG_START_COL - 1)).toBe(false);
  });
});

describe("canPlantHere", () => {
  it("allows placing a standard plant on an empty land cell", () => {
    const grid = generateGrid(DAY_ENV);
    expect(
      canPlantHere(grid, 0, 0, { isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false })
    ).toBe(true);
  });

  it("rejects placing a standard plant on a cell that already has a plant", () => {
    const grid = generateGrid(DAY_ENV);
    setPlantOnCell(grid, 0, 0, "plant-1");
    expect(
      canPlantHere(grid, 0, 0, { isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false })
    ).toBe(false);
  });

  it("allows placing an aquatic plant directly on water (no lily pad)", () => {
    const grid = generateGrid(POOL_ENV);
    expect(
      canPlantHere(grid, 2, 0, { isAquatic: true, requiresLilyPad: false, requiresFlowerPot: false })
    ).toBe(true);
  });

  it("rejects standard plant on water without a lily pad", () => {
    const grid = generateGrid(POOL_ENV);
    expect(
      canPlantHere(grid, 2, 0, { isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false })
    ).toBe(false);
  });

  it("allows plant with requiresLilyPad on water cell that has a lily pad", () => {
    const grid = generateGrid(POOL_ENV);
    setLilyPadOnCell(grid, 2, 0, "lilypad-1");
    expect(
      canPlantHere(grid, 2, 0, { isAquatic: false, requiresLilyPad: true, requiresFlowerPot: false })
    ).toBe(true);
  });

  it("allows a standard land plant on water once a lily pad occupies the platform slot", () => {
    const grid = generateGrid(POOL_ENV);
    setLilyPadOnCell(grid, 2, 0, "lilypad-1");
    expect(
      canPlantHere(grid, 2, 0, { isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false })
    ).toBe(true);
  });

  it("allows Lily Pad only in an empty water platform slot", () => {
    const grid = generateGrid(POOL_ENV);
    expect(
      canPlantHere(grid, 2, 0, {
        isAquatic: true,
        requiresLilyPad: false,
        requiresFlowerPot: false,
        isLilyPad: true,
      })
    ).toBe(true);

    setLilyPadOnCell(grid, 2, 0, "lilypad-1");
    expect(
      canPlantHere(grid, 2, 0, {
        isAquatic: true,
        requiresLilyPad: false,
        requiresFlowerPot: false,
        isLilyPad: true,
      })
    ).toBe(false);
  });

  it("rejects Lily Pad on land", () => {
    const grid = generateGrid(DAY_ENV);
    expect(
      canPlantHere(grid, 0, 0, {
        isAquatic: true,
        requiresLilyPad: false,
        requiresFlowerPot: false,
        isLilyPad: true,
      })
    ).toBe(false);
  });

  it("rejects aquatic plants on land", () => {
    const grid = generateGrid(DAY_ENV);
    expect(
      canPlantHere(grid, 0, 0, { isAquatic: true, requiresLilyPad: false, requiresFlowerPot: false })
    ).toBe(false);
  });

  it("rejects plant with requiresLilyPad on water without a lily pad", () => {
    const grid = generateGrid(POOL_ENV);
    expect(
      canPlantHere(grid, 2, 0, { isAquatic: false, requiresLilyPad: true, requiresFlowerPot: false })
    ).toBe(false);
  });

  it("rejects standard plant on slope tile without flower pot", () => {
    const grid = generateGrid(ROOF_ENV);
    expect(
      canPlantHere(grid, 0, 0, { isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false })
    ).toBe(false);
  });

  it("allows plant with requiresFlowerPot on slope tile that has a flower pot", () => {
    const grid = generateGrid(ROOF_ENV);
    setFlowerPotOnCell(grid, 0, 0, "pot-1");
    expect(
      canPlantHere(grid, 0, 0, { isAquatic: false, requiresLilyPad: false, requiresFlowerPot: true })
    ).toBe(true);
  });

  it("allows Flower Pot in an empty roof platform slot", () => {
    const grid = generateGrid(ROOF_ENV);
    expect(
      canPlantHere(grid, 0, 0, {
        isAquatic: false,
        requiresLilyPad: false,
        requiresFlowerPot: false,
        isFlowerPot: true,
      })
    ).toBe(true);
  });

  it("rejects Flower Pot on water even if a Lily Pad exists there", () => {
    const grid = generateGrid(POOL_ENV);
    setLilyPadOnCell(grid, 2, 0, "lilypad-1");
    expect(
      canPlantHere(grid, 2, 0, {
        isAquatic: false,
        requiresLilyPad: true,
        requiresFlowerPot: false,
        isFlowerPot: true,
      })
    ).toBe(false);
  });

  it("rejects Flower Pot on normal land", () => {
    const grid = generateGrid(DAY_ENV);
    expect(
      canPlantHere(grid, 0, 0, {
        isAquatic: false,
        requiresLilyPad: false,
        requiresFlowerPot: false,
        isFlowerPot: true,
      })
    ).toBe(false);
  });

  it("rejects planting on graves", () => {
    const grid = generateGrid(DAY_ENV);
    grid[0][0].graveId = "grave-1";
    expect(
      canPlantHere(grid, 0, 0, { isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false })
    ).toBe(false);
  });

  it("returns false for out-of-bounds coordinates", () => {
    const grid = generateGrid(DAY_ENV);
    expect(
      canPlantHere(grid, -1, 0, { isAquatic: false, requiresLilyPad: false, requiresFlowerPot: false })
    ).toBe(false);
  });
});

describe("setPlantOnCell / getRow", () => {
  it("setPlantOnCell mutates the target cell in place", () => {
    const grid = generateGrid(DAY_ENV);
    setPlantOnCell(grid, 1, 3, "plant-abc");
    expect(grid[1][3].plantInstanceId).toBe("plant-abc");
  });

  it("setPlantOnCell with null clears the plant slot", () => {
    const grid = generateGrid(DAY_ENV);
    setPlantOnCell(grid, 1, 3, "plant-abc");
    setPlantOnCell(grid, 1, 3, null);
    expect(grid[1][3].plantInstanceId).toBeNull();
  });

  it("getRow returns all 9 cells for a valid row", () => {
    const grid = generateGrid(DAY_ENV);
    expect(getRow(grid, 2)).toHaveLength(9);
  });

  it("getRow returns [] for an invalid row", () => {
    const grid = generateGrid(DAY_ENV);
    expect(getRow(grid, 99)).toHaveLength(0);
  });
});

describe("getEastmostPlantCol", () => {
  it("returns null when no plants in lane", () => {
    const grid = generateGrid(DAY_ENV);
    expect(getEastmostPlantCol(grid, 0)).toBeNull();
  });

  it("returns the highest col index with a plant", () => {
    const grid = generateGrid(DAY_ENV);
    setPlantOnCell(grid, 0, 2, "p1");
    setPlantOnCell(grid, 0, 5, "p2");
    expect(getEastmostPlantCol(grid, 0)).toBe(5);
  });

  it("returns the only occupied col when one plant exists", () => {
    const grid = generateGrid(DAY_ENV);
    setPlantOnCell(grid, 3, 7, "p1");
    expect(getEastmostPlantCol(grid, 3)).toBe(7);
  });
});
