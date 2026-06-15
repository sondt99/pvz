import type { SerializedGameState } from "@/lib/game-serializer";
import type { GameEngineState, EnvironmentType, SeedPacketSlot } from "@/engine/types";

export const CLIENT_SESSION_TOKEN_STORAGE_KEY = "pvz_session_token";

export interface GameSessionListItem {
  id: string;
  status: string;
  score: number;
  waveNumber: number;
  lastSavedAt: string;
  levelNumber: number | null;
  environmentType: EnvironmentType;
}

export interface CreateGameSessionResult {
  sessionId: string;
  createdAt: string;
}

export interface LoadGameSessionResult {
  session: {
    id: string;
    userId: string;
    levelNumber: number | null;
    status: string;
    startedAt: string;
    lastSavedAt: string;
  };
  state: Partial<GameEngineState>;
}

type Fetcher = typeof fetch;

export function getStoredSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CLIENT_SESSION_TOKEN_STORAGE_KEY);
}

export function storeSessionToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLIENT_SESSION_TOKEN_STORAGE_KEY, token);
}

export function clearSessionToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLIENT_SESSION_TOKEN_STORAGE_KEY);
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = getStoredSessionToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/auth/me", {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { user: CurrentUser | null };
    return data.user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const token = getStoredSessionToken();
  if (token) {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  clearSessionToken();
}

export async function listGameSessions(fetcher: Fetcher = fetch): Promise<GameSessionListItem[]> {
  const response = await fetcher("/api/game/sessions", {
    method: "GET",
    credentials: "include",
    headers: authHeaders(),
  });
  return parseJsonResponse<GameSessionListItem[]>(response);
}

export async function createGameSession(
  environmentType: EnvironmentType,
  loadout: string[],
  fetcher?: Fetcher | number,
  _unused?: Fetcher
): Promise<CreateGameSessionResult>;
export async function createGameSession(
  environmentType: EnvironmentType,
  loadout: string[],
  options?: { levelNumber?: number },
  fetcher?: Fetcher
): Promise<CreateGameSessionResult>;
export async function createGameSession(
  environmentType: EnvironmentType,
  loadout: string[],
  fetcherOrOptions?: Fetcher | number | { levelNumber?: number },
  maybeFetcher?: Fetcher
): Promise<CreateGameSessionResult> {
  let levelNumber: number | undefined;
  let fetcher: Fetcher = fetch;

  if (typeof fetcherOrOptions === "function") {
    fetcher = fetcherOrOptions;
  } else if (typeof fetcherOrOptions === "object" && fetcherOrOptions !== null) {
    levelNumber = fetcherOrOptions.levelNumber;
    if (maybeFetcher) fetcher = maybeFetcher;
  }

  const response = await fetcher("/api/game/sessions", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ environmentType, loadout, levelNumber }),
  });
  return parseJsonResponse<CreateGameSessionResult>(response);
}

export async function loadGameSession(
  sessionId: string,
  fetcher: Fetcher = fetch
): Promise<LoadGameSessionResult> {
  const response = await fetcher(`/api/game/sessions/${sessionId}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(),
  });
  return parseJsonResponse<LoadGameSessionResult>(response);
}

export async function saveGameSession(
  sessionId: string,
  payload: SerializedGameState,
  fetcher: Fetcher = fetch
): Promise<{ ok: true; savedAt: string }> {
  const response = await fetcher(`/api/game/sessions/${sessionId}/save`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<{ ok: true; savedAt: string }>(response);
}

export interface LevelConfigResult {
  level: {
    levelNumber: number;
    name: string;
    environmentType: EnvironmentType;
    gridRows: number;
    gridCols: number;
    waterLaneIndices: number[];
    gravesEnabled: boolean;
    fogEnabled: boolean;
    slopeEnabled: boolean;
    conveyorBelt: boolean;
    skyDropSun: boolean;
    startingSun: number;
    seedSlots: number;
    rewardPlantId: string | null;
    waveConfig: unknown;
  };
  loadout: SeedPacketSlot[];
}

export interface CompleteSessionResult {
  ok: boolean;
  rewardUnlocked?: boolean;
  alreadyCompleted?: boolean;
}

export async function fetchLevelConfig(
  levelNumber: number,
  fetcher: Fetcher = fetch
): Promise<LevelConfigResult> {
  const response = await fetcher(`/api/game/level-config?levelNumber=${levelNumber}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(),
  });
  return parseJsonResponse<LevelConfigResult>(response);
}

export async function completeGameSession(
  sessionId: string,
  payload: { score: number; totalZombiesKilled: number; waveNumber: number; gameTimeMs: number },
  fetcher: Fetcher = fetch
): Promise<CompleteSessionResult> {
  const response = await fetcher(`/api/game/sessions/${sessionId}/complete`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<CompleteSessionResult>(response);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : "Request failed";
    throw new Error(message);
  }
  return body as T;
}

function authHeaders(): HeadersInit {
  const token = getStoredSessionToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}
