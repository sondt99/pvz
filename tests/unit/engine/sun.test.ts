import { describe, it, expect } from "vitest";
import {
  getInitialSun,
  skyDropsEnabled,
  tickSkySun,
  createSkySunDrop,
  shouldProduceSun,
  createPlantSunDrop,
  spendSun,
  collectSun,
  advanceSunDrop,
  isSunDropExpired,
} from "@/engine/sun";
import type { EnvironmentConfig, RuntimeSunDrop } from "@/engine/types";
import { SKY_SUN_INTERVAL_MS, SUN_LIFETIME_MS } from "@/engine/constants";

const DAY: EnvironmentConfig = {
  type: "DAY", gridRows: 5, gridCols: 9, waterLaneIndices: [],
  gravesEnabled: false, fogEnabled: false, slopeEnabled: false, conveyorBelt: false, skyDropSun: true,
};

const NIGHT: EnvironmentConfig = {
  type: "NIGHT", gridRows: 5, gridCols: 9, waterLaneIndices: [],
  gravesEnabled: true, fogEnabled: false, slopeEnabled: false, conveyorBelt: false, skyDropSun: false,
};

const ROOF: EnvironmentConfig = {
  type: "ROOF", gridRows: 5, gridCols: 9, waterLaneIndices: [],
  gravesEnabled: false, fogEnabled: false, slopeEnabled: true, conveyorBelt: false, skyDropSun: false,
};

describe("getInitialSun", () => {
  it("returns 50 for DAY environment", () => {
    expect(getInitialSun(DAY)).toBe(50);
  });

  it("returns 50 for NIGHT environment", () => {
    expect(getInitialSun(NIGHT)).toBe(50);
  });
});

describe("skyDropsEnabled", () => {
  it("returns true for DAY", () => expect(skyDropsEnabled(DAY)).toBe(true));
  it("returns false for NIGHT", () => expect(skyDropsEnabled(NIGHT)).toBe(false));
  it("returns false for ROOF", () => expect(skyDropsEnabled(ROOF)).toBe(false));
});

describe("tickSkySun", () => {
  it("returns shouldDrop=false when time has not reached next drop time", () => {
    const result = tickSkySun(3000, SKY_SUN_INTERVAL_MS, DAY);
    expect(result.shouldDrop).toBe(false);
    expect(result.nextSkyDropAtMs).toBe(SKY_SUN_INTERVAL_MS);
  });

  it("returns shouldDrop=true when time equals next drop time", () => {
    const result = tickSkySun(SKY_SUN_INTERVAL_MS, SKY_SUN_INTERVAL_MS, DAY);
    expect(result.shouldDrop).toBe(true);
    expect(result.nextSkyDropAtMs).toBe(SKY_SUN_INTERVAL_MS * 2);
  });

  it("returns shouldDrop=true and schedules next drop when time exceeds next drop time", () => {
    const result = tickSkySun(8500, SKY_SUN_INTERVAL_MS, DAY);
    expect(result.shouldDrop).toBe(true);
    expect(result.nextSkyDropAtMs).toBe(8500 + SKY_SUN_INTERVAL_MS);
  });

  it("never drops on NIGHT (skyDropSun=false)", () => {
    const result = tickSkySun(99999, 0, NIGHT);
    expect(result.shouldDrop).toBe(false);
  });

  it("never drops on ROOF (skyDropSun=false)", () => {
    const result = tickSkySun(99999, 0, ROOF);
    expect(result.shouldDrop).toBe(false);
  });
});

describe("createSkySunDrop", () => {
  it("creates a sun drop with correct value=25 and source='sky'", () => {
    const drop = createSkySunDrop(1000, "sun-1", 4, 2);
    expect(drop.value).toBe(25);
    expect(drop.source).toBe("sky");
    expect(drop.state).toBe("falling");
  });

  it("uses the provided instanceId", () => {
    const drop = createSkySunDrop(1000, "sun-test-id", 3, 1);
    expect(drop.instanceId).toBe("sun-test-id");
  });

  it("positions x at col + 0.5 (column center)", () => {
    const drop = createSkySunDrop(1000, "s1", 4, 2);
    expect(drop.x).toBe(4.5);
  });

  it("starts above the grid (y = -1)", () => {
    const drop = createSkySunDrop(1000, "s1", 0, 1);
    expect(drop.y).toBe(-1);
  });

  it("has the correct lifetime", () => {
    const drop = createSkySunDrop(1000, "s1", 0, 1);
    expect(drop.lifetimeMs).toBe(SUN_LIFETIME_MS);
  });
});

describe("shouldProduceSun", () => {
  it("returns false when interval has not elapsed", () => {
    expect(shouldProduceSun(5000, 0, 24000)).toBe(false);
  });

  it("returns true when interval has elapsed", () => {
    expect(shouldProduceSun(24000, 0, 24000)).toBe(true);
  });

  it("returns true when more than interval has elapsed", () => {
    expect(shouldProduceSun(30000, 0, 24000)).toBe(true);
  });

  it("uses default interval (SUNFLOWER_PRODUCE_INTERVAL_MS = 24000)", () => {
    expect(shouldProduceSun(24000, 0)).toBe(true);
    expect(shouldProduceSun(23999, 0)).toBe(false);
  });
});

describe("createPlantSunDrop", () => {
  it("creates a plant sun drop with source='plant'", () => {
    const drop = createPlantSunDrop(5000, "plant-sun-1", 2, 3);
    expect(drop.source).toBe("plant");
    expect(drop.value).toBe(25);
  });

  it("positions correctly at col center", () => {
    const drop = createPlantSunDrop(0, "id", 3, 1);
    expect(drop.x).toBe(3.5);
  });

  it("accepts custom sun value", () => {
    const drop = createPlantSunDrop(0, "id", 0, 0, 50);
    expect(drop.value).toBe(50);
  });
});

describe("spendSun", () => {
  it("returns new total when sufficient sun", () => {
    expect(spendSun(100, 50)).toBe(50);
  });

  it("returns 0 when spending exactly all sun", () => {
    expect(spendSun(50, 50)).toBe(0);
  });

  it("returns null when insufficient sun", () => {
    expect(spendSun(49, 50)).toBeNull();
  });

  it("returns null when sun is 0 and cost > 0", () => {
    expect(spendSun(0, 25)).toBeNull();
  });

  it("returns original when cost is 0 (free plant like Puff-shroom)", () => {
    expect(spendSun(50, 0)).toBe(50);
  });
});

describe("collectSun", () => {
  it("adds drop value to current sun", () => {
    expect(collectSun(50, 25)).toBe(75);
  });

  it("handles collection from 0", () => {
    expect(collectSun(0, 25)).toBe(25);
  });
});

describe("advanceSunDrop", () => {
  const fallingDrop: RuntimeSunDrop = {
    instanceId: "s1", x: 4.5, y: -1, targetY: 2,
    value: 25, source: "sky", state: "falling",
    spawnedAtMs: 0, lifetimeMs: SUN_LIFETIME_MS,
  };

  it("moves the drop toward targetY", () => {
    const result = advanceSunDrop(fallingDrop, 1000, 0.001);
    expect(result.y).toBeCloseTo(-1 + 0.001 * 1000);
    expect(result.state).toBe("falling");
  });

  it("lands the drop when y reaches targetY", () => {
    const almostLanded: RuntimeSunDrop = { ...fallingDrop, y: 1.99 };
    const result = advanceSunDrop(almostLanded, 500, 0.01);
    expect(result.state).toBe("landed");
    expect(result.y).toBe(2);
  });

  it("does not move a landed drop", () => {
    const landed: RuntimeSunDrop = { ...fallingDrop, state: "landed", y: 2 };
    const result = advanceSunDrop(landed, 1000, 0.001);
    expect(result.y).toBe(2);
    expect(result.state).toBe("landed");
  });

  it("does not move a collected drop", () => {
    const collected: RuntimeSunDrop = { ...fallingDrop, state: "collected", y: 2 };
    const result = advanceSunDrop(collected, 1000, 0.001);
    expect(result.y).toBe(2);
  });
});

describe("isSunDropExpired", () => {
  const base: RuntimeSunDrop = {
    instanceId: "s1", x: 0, y: 2, targetY: 2,
    value: 25, source: "sky", state: "landed",
    spawnedAtMs: 0, lifetimeMs: SUN_LIFETIME_MS,
  };

  it("returns false when not yet expired", () => {
    expect(isSunDropExpired(base, 8000)).toBe(false);
  });

  it("returns true when expired", () => {
    expect(isSunDropExpired(base, SUN_LIFETIME_MS + 1)).toBe(true);
  });

  it("returns false for a falling drop even if time is past lifetime", () => {
    const falling: RuntimeSunDrop = { ...base, state: "falling" };
    expect(isSunDropExpired(falling, 99999)).toBe(false);
  });

  it("returns false for a collected drop", () => {
    const collected: RuntimeSunDrop = { ...base, state: "collected" };
    expect(isSunDropExpired(collected, 99999)).toBe(false);
  });
});
