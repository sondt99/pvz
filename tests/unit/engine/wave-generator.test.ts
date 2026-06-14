import { describe, expect, it } from "vitest";
import {
  generateWave,
  getFinalWaveNumber,
  parseWaveConfig,
} from "@/engine/wave-generator";
import { createInitialRngState } from "@/engine/rng";

describe("wave-generator", () => {
  it("generates deterministic fallback waves from a fixed seed", () => {
    const seed = createInitialRngState(["level-1", "wave-test"]);

    const first = generateWave(3, 5, seed);
    const second = generateWave(3, 5, seed);

    expect(second.entries).toEqual(first.entries);
    expect(second.rngState).toBe(first.rngState);
    expect(first.entries).toHaveLength(9);
  });

  it("uses configured entries and resolves random lanes deterministically", () => {
    const waveConfig = parseWaveConfig({
      finalWaveNumber: 2,
      waves: [
        {
          waveNumber: 1,
          entries: [
            { zombieType: "NORMAL", lane: 2, spawnAtMs: 0 },
            { zombieType: "CONEHEAD", lane: [0, 4], spawnAtMs: 500 },
          ],
        },
      ],
    });
    const seed = createInitialRngState(["configured-wave"]);

    const first = generateWave(1, 5, seed, waveConfig);
    const second = generateWave(1, 5, seed, waveConfig);

    expect(first.entries).toEqual(second.entries);
    expect(first.entries[0]).toEqual({ zombieType: "NORMAL", lane: 2, spawnAtMs: 0 });
    expect([0, 4]).toContain(first.entries[1].lane);
    expect(first.entries[1]).toMatchObject({ zombieType: "CONEHEAD", spawnAtMs: 500 });
    expect(getFinalWaveNumber(waveConfig)).toBe(2);
  });

  it("supports configured final waves with flag zombies", () => {
    const waveConfig = parseWaveConfig({
      waves: [
        {
          count: 2,
          zombiePool: ["NORMAL"],
          flag: true,
          final: true,
        },
      ],
    });
    const result = generateWave(1, 5, createInitialRngState(["final"]), waveConfig);

    expect(result.isFlagWave).toBe(true);
    expect(result.isFinalWave).toBe(true);
    expect(result.entries.map((entry) => entry.zombieType)).toEqual([
      "NORMAL",
      "NORMAL",
      "FLAG",
    ]);
    expect(getFinalWaveNumber(waveConfig)).toBe(1);
  });
});
