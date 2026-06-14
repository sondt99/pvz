import { describe, it, expect } from "vitest";
import {
  updateStraightProjectile,
  updateLobbedProjectile,
  isOffscreen,
  hasLobbedLanded,
  calcLobbedVelocity,
  createStraightProjectile,
  createLobbedProjectile,
} from "@/engine/physics/trajectory";
import type { RuntimeProjectile } from "@/engine/types";

const makeStr = (overrides: Partial<RuntimeProjectile> = {}): RuntimeProjectile => ({
  instanceId: "p1",
  projectileType: "PEA",
  lane: 0,
  x: 2,
  y: 0,
  velX: 8,
  velY: 0,
  damage: 20,
  trajectory: "straight",
  sourceCol: 1,
  ...overrides,
});

const makeLob = (overrides: Partial<RuntimeProjectile> = {}): RuntimeProjectile => ({
  instanceId: "p2",
  projectileType: "CABBAGE",
  lane: 2,
  x: 1,
  y: 0,
  velX: 4,
  velY: -10,
  damage: 40,
  trajectory: "lobbed",
  sourceCol: 1,
  targetCol: 7,
  targetLane: 2,
  ...overrides,
});

describe("updateStraightProjectile", () => {
  it("advances x by velX * delta in seconds", () => {
    const proj = makeStr({ x: 2, velX: 8 });
    const result = updateStraightProjectile(proj, 1000); // 1 second
    expect(result.x).toBeCloseTo(10);
  });

  it("advances half the distance in half the time", () => {
    const proj = makeStr({ x: 0, velX: 8 });
    const result = updateStraightProjectile(proj, 500); // 0.5 s
    expect(result.x).toBeCloseTo(4);
  });

  it("does not change y", () => {
    const proj = makeStr({ y: 0 });
    const result = updateStraightProjectile(proj, 1000);
    expect(result.y).toBe(0);
  });

  it("advances lane by velLane * delta for diagonal or vertical stars", () => {
    const proj = makeStr({ lane: 2, velLane: -4 });
    const result = updateStraightProjectile(proj, 500);
    expect(result.lane).toBeCloseTo(0);
  });

  it("preserves other fields", () => {
    const proj = makeStr({ damage: 42 });
    expect(updateStraightProjectile(proj, 100).damage).toBe(42);
  });
});

describe("updateLobbedProjectile", () => {
  it("advances x by velX * delta", () => {
    const proj = makeLob({ x: 1, velX: 4 });
    const result = updateLobbedProjectile(proj, 1000);
    expect(result.x).toBeCloseTo(5);
  });

  it("updates y using velY (negative = upward initially)", () => {
    const proj = makeLob({ y: 0, velY: -10 });
    const result = updateLobbedProjectile(proj, 500); // 0.5 s
    // y = 0 + (-10)*0.5 = -5
    expect(result.y).toBeCloseTo(-5);
  });

  it("accelerates velY due to gravity", () => {
    const proj = makeLob({ velY: -10 });
    const result = updateLobbedProjectile(proj, 1000); // GRAVITY=20, t=1s
    // newVelY = -10 + 20*1 = 10
    expect(result.velY).toBeCloseTo(10);
  });

  it("velY increases due to gravity each step (forward-Euler integration)", () => {
    // Implementation uses forward-Euler: y_new = y + velY_old*dt; velY_new = velY_old + g*dt
    const proj = makeLob({ y: 0, velY: -10, velX: 0 });

    // At t=500ms: y = 0 + (-10)*0.5 = -5; velY = -10 + 20*0.5 = 0 (peak)
    const at500 = updateLobbedProjectile(proj, 500);
    expect(at500.y).toBeCloseTo(-5);
    expect(at500.velY).toBeCloseTo(0);

    // At t=1000ms: y = 0 + (-10)*1 = -10; velY = -10 + 20*1 = 10
    const at1000 = updateLobbedProjectile(proj, 1000);
    expect(at1000.y).toBeCloseTo(-10);
    expect(at1000.velY).toBeCloseTo(10);
  });
});

describe("isOffscreen", () => {
  it("returns false when projectile is within grid", () => {
    expect(isOffscreen(makeStr({ x: 5 }), 9)).toBe(false);
  });

  it("returns true when x > gridCols + 1", () => {
    expect(isOffscreen(makeStr({ x: 10.5 }), 9)).toBe(true);
  });

  it("returns true when x < -1", () => {
    expect(isOffscreen(makeStr({ x: -1.1 }), 9)).toBe(true);
  });

  it("returns true when a straight projectile leaves row bounds", () => {
    expect(isOffscreen(makeStr({ lane: -1.1 }), 9, 5)).toBe(true);
    expect(isOffscreen(makeStr({ lane: 5.1 }), 9, 5)).toBe(true);
  });

  it("returns false for lobbed projectiles (caller checks landing instead)", () => {
    expect(isOffscreen(makeLob({ x: 15 }), 9)).toBe(false);
  });
});

describe("hasLobbedLanded", () => {
  it("returns false when x has not reached targetCol", () => {
    expect(hasLobbedLanded(makeLob({ x: 5, targetCol: 7 }))).toBe(false);
  });

  it("returns true when x reaches targetCol", () => {
    expect(hasLobbedLanded(makeLob({ x: 7, targetCol: 7 }))).toBe(true);
  });

  it("returns true when x exceeds targetCol", () => {
    expect(hasLobbedLanded(makeLob({ x: 7.5, targetCol: 7 }))).toBe(true);
  });

  it("returns false for straight projectiles", () => {
    expect(hasLobbedLanded(makeStr({ x: 10, targetCol: 7 }))).toBe(false);
  });

  it("returns false when targetCol is undefined", () => {
    const proj = { ...makeLob(), targetCol: undefined };
    expect(hasLobbedLanded(proj)).toBe(false);
  });
});

describe("calcLobbedVelocity", () => {
  it("velX covers the horizontal distance in flightTime", () => {
    const { velX } = calcLobbedVelocity(1, 7, 2000); // 2s flight, Δx=6
    expect(velX).toBeCloseTo(3); // 6/2 = 3 cols/s
  });

  it("velY is such that projectile returns to y=0 at flightTime", () => {
    // y(t) = velY*t + 0.5*g*t²  =  0  when t=flightTime
    // velY = -0.5*20*2 = -20 (for 2s flight)
    const { velY } = calcLobbedVelocity(0, 6, 2000);
    expect(velY).toBeCloseTo(-20);
  });

  it("velX is negative when target is to the left (Split Pea back)", () => {
    const { velX } = calcLobbedVelocity(7, 1, 2000);
    expect(velX).toBeLessThan(0);
  });
});

describe("createStraightProjectile", () => {
  it("creates a projectile with trajectory=straight", () => {
    const p = createStraightProjectile("p1", "PEA", 2, 3, 20);
    expect(p.trajectory).toBe("straight");
    expect(p.projectileType).toBe("PEA");
    expect(p.lane).toBe(2);
    expect(p.damage).toBe(20);
  });

  it("starts x slightly ahead of source column", () => {
    const p = createStraightProjectile("p1", "PEA", 0, 4, 20);
    expect(p.x).toBeCloseTo(4.8);
  });

  it("can create a backward projectile for Split Pea rear shots", () => {
    const p = createStraightProjectile("p1", "PEA", 0, 4, 20, { direction: "backward" });
    expect(p.x).toBeLessThan(4);
    expect(p.velX).toBeLessThan(0);
  });

  it("can create a vertical straight projectile for Starfruit", () => {
    const p = createStraightProjectile("p1", "STAR", 2, 4, 20, { velX: 0, velLane: -8, xOffset: 0.5 });
    expect(p.x).toBeCloseTo(4.5);
    expect(p.velX).toBe(0);
    expect(p.velLane).toBe(-8);
    expect(p.sourceLane).toBe(2);
  });

  it("applies slowFactor opt", () => {
    const p = createStraightProjectile("p1", "FROZEN_PEA", 0, 0, 20, { slowFactor: 0.5 });
    expect(p.slowFactor).toBe(0.5);
  });

  it("applies maxTravelDistanceCols opt", () => {
    const p = createStraightProjectile("p1", "FUME", 0, 2, 20, { maxTravelDistanceCols: 4 });
    expect(p.maxTravelDistanceCols).toBe(4);
  });
});

describe("createLobbedProjectile", () => {
  it("creates a projectile with trajectory=lobbed", () => {
    const p = createLobbedProjectile("p1", "CABBAGE", 2, 1, 2, 7, 40);
    expect(p.trajectory).toBe("lobbed");
    expect(p.targetCol).toBe(7);
    expect(p.targetLane).toBe(2);
  });

  it("velY is negative (upward launch)", () => {
    const p = createLobbedProjectile("p1", "CABBAGE", 0, 0, 0, 6, 40);
    expect(p.velY).toBeLessThan(0);
  });

  it("velX is positive for right-side target", () => {
    const p = createLobbedProjectile("p1", "CABBAGE", 0, 1, 0, 7, 40, 2000);
    expect(p.velX).toBeGreaterThan(0);
  });
});
