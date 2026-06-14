import type { SerializedGameState } from "@/lib/game-serializer";
import type { GameEngineState, EnvironmentType } from "@/engine/types";

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
  fetcher: Fetcher = fetch
): Promise<CreateGameSessionResult> {
  const response = await fetcher("/api/game/sessions", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ environmentType, loadout }),
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
