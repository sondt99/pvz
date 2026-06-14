import { describe, expect, it, vi } from "vitest";
import {
  createGameSession,
  listGameSessions,
  loadGameSession,
  saveGameSession,
} from "@/lib/game-session-client";
import type { SerializedGameState } from "@/lib/game-serializer";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createPayload(): SerializedGameState {
  return {
    gameTimeMs: 0,
    environmentState: { gridCells: [], nextSkyDropTimerMs: 0 },
    graveState: [],
    gridState: [],
    zombieState: [],
    projectileState: [],
    sunDropState: [],
    lawnMowerState: [],
    spawnQueueState: [],
    seedCooldowns: {},
    loadoutSnapshot: ["PEASHOOTER"],
    currentSun: 50,
    cumulativeSun: 0,
    score: 0,
    waveNumber: 0,
    nextWaveTimerMs: 0,
    totalZombiesKilled: 0,
  };
}

describe("game session client", () => {
  it("creates a DB-backed game session with credentials included", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ sessionId: "game-session-1", createdAt: "2026-06-14T00:00:00.000Z" }, 201)
    ) as unknown as typeof fetch;

    const result = await createGameSession("POOL", ["PEASHOOTER", "LILY_PAD"], fetcher);

    expect(result.sessionId).toBe("game-session-1");
    expect(fetcher).toHaveBeenCalledWith(
      "/api/game/sessions",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          environmentType: "POOL",
          loadout: ["PEASHOOTER", "LILY_PAD"],
        }),
      })
    );
  });

  it("lists active sessions and keeps environmentType for resume matching", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse([
        {
          id: "session-day",
          status: "PAUSED",
          score: 100,
          waveNumber: 2,
          lastSavedAt: "2026-06-14T00:00:00.000Z",
          levelNumber: 1,
          environmentType: "DAY",
        },
      ])
    ) as unknown as typeof fetch;

    const sessions = await listGameSessions(fetcher);

    expect(sessions[0].environmentType).toBe("DAY");
    expect(fetcher).toHaveBeenCalledWith(
      "/api/game/sessions",
      expect.objectContaining({ method: "GET", credentials: "include" })
    );
  });

  it("loads and saves a session through the expected endpoints", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          session: {
            id: "session-1",
            userId: "user-1",
            levelNumber: 1,
            status: "PAUSED",
            startedAt: "2026-06-14T00:00:00.000Z",
            lastSavedAt: "2026-06-14T00:00:00.000Z",
          },
          state: { currentSun: 75 },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({ ok: true, savedAt: "2026-06-14T00:00:01.000Z" })
      ) as unknown as typeof fetch;

    await expect(loadGameSession("session-1", fetcher)).resolves.toMatchObject({
      session: { id: "session-1" },
      state: { currentSun: 75 },
    });
    await expect(saveGameSession("session-1", createPayload(), fetcher)).resolves.toMatchObject({
      ok: true,
    });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "/api/game/sessions/session-1",
      expect.objectContaining({ method: "GET", credentials: "include" })
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/game/sessions/session-1/save",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
  });

  it("throws API error messages for failed responses", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ error: "Authentication required" }, 401)
    ) as unknown as typeof fetch;

    await expect(listGameSessions(fetcher)).rejects.toThrow("Authentication required");
  });
});
