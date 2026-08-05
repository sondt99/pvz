"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/game-store";
import { useGameLoop } from "@/hooks/useGameLoop";
import { GameCanvas } from "@/components/game/GameCanvas";
import { GameHUD } from "@/components/game/GameHUD";
import { SeedPacketBar } from "@/components/game/SeedPacketBar";
import { SeedChooser, type AvailablePlant } from "@/components/game/SeedChooser";
import { GRID_COLS, GRID_ROWS_POOL, GRID_ROWS_STANDARD } from "@/engine/constants";
import { getPlantDef } from "@/engine/entities/plant-defs";
import {
  ENVIRONMENT_TYPES,
  type EnvironmentConfig,
  type EnvironmentType,
  type SeedPacketSlot,
} from "@/engine/types";
import { serializeGameState } from "@/lib/game-serializer";
import {
  completeGameSession,
  createGameSession,
  fetchLevelConfig,
  getCurrentUser,
  loadGameSession,
  saveGameSession,
  type LevelConfigResult,
} from "@/lib/game-session-client";

const ENVIRONMENTS: Record<EnvironmentType, EnvironmentConfig> = {
  DAY: {
    type: "DAY",
    gridRows: GRID_ROWS_STANDARD,
    gridCols: GRID_COLS,
    waterLaneIndices: [],
    gravesEnabled: false,
    fogEnabled: false,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: true,
  },
  NIGHT: {
    type: "NIGHT",
    gridRows: GRID_ROWS_STANDARD,
    gridCols: GRID_COLS,
    waterLaneIndices: [],
    gravesEnabled: true,
    fogEnabled: false,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: false,
  },
  POOL: {
    type: "POOL",
    gridRows: GRID_ROWS_POOL,
    gridCols: GRID_COLS,
    waterLaneIndices: [2, 3],
    gravesEnabled: false,
    fogEnabled: false,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: true,
  },
  FOG: {
    type: "FOG",
    gridRows: GRID_ROWS_POOL,
    gridCols: GRID_COLS,
    waterLaneIndices: [2, 3],
    gravesEnabled: false,
    fogEnabled: true,
    slopeEnabled: false,
    conveyorBelt: false,
    skyDropSun: false,
  },
  ROOF: {
    type: "ROOF",
    gridRows: GRID_ROWS_STANDARD,
    gridCols: GRID_COLS,
    waterLaneIndices: [],
    gravesEnabled: false,
    fogEnabled: false,
    slopeEnabled: true,
    conveyorBelt: false,
    skyDropSun: true,
  },
};

const ENVIRONMENT_ORDER: EnvironmentType[] = [...ENVIRONMENT_TYPES];

const ENVIRONMENT_LABELS: Record<EnvironmentType, { icon: string; label: string }> = {
  DAY: { icon: "☀️", label: "Day" },
  NIGHT: { icon: "🌙", label: "Night" },
  POOL: { icon: "🌊", label: "Pool" },
  FOG: { icon: "🌫️", label: "Fog" },
  ROOF: { icon: "🏠", label: "Roof" },
};

function toTitleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** Freeplay env loadouts (not adventure). */
const FREEPLAY_LOADOUTS: Record<EnvironmentType, string[]> = {
  DAY: ["SUNFLOWER", "PEASHOOTER", "WALL_NUT", "POTATO_MINE", "SNOW_PEA", "CHERRY_BOMB"],
  NIGHT: ["SUN_SHROOM", "PUFF_SHROOM", "FUME_SHROOM", "SCAREDY_SHROOM", "WALL_NUT", "ICE_SHROOM", "DOOM_SHROOM"],
  POOL: ["SUNFLOWER", "PEASHOOTER", "LILY_PAD", "TANGLE_KELP", "WALL_NUT", "TORCHWOOD", "SNOW_PEA"],
  FOG: ["SUN_SHROOM", "SEA_SHROOM", "LILY_PAD", "PLANTERN", "BLOVER", "SPLIT_PEA", "STARFRUIT"],
  ROOF: ["FLOWER_POT", "CABBAGE_PULT", "KERNEL_PULT", "WALL_NUT", "GARLIC", "CHERRY_BOMB", "MELON_PULT"],
};

function makeLoadoutFromTypes(plantTypes: string[]): SeedPacketSlot[] {
  return plantTypes.map((plantType, index) => {
    const def = getPlantDef(plantType);
    return {
      plantType,
      plantId: plantType.toLowerCase().replace(/_/g, "-"),
      sunCost: def.sunCost,
      cooldownRemainingMs: 0,
      cooldownTotalMs: def.rechargeTime * 1000,
      isSelected: false,
      slotIndex: index,
    };
  });
}

function parseLevelParam(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("level");
  const n = Number(raw);
  return raw && Number.isInteger(n) && n > 0 ? n : null;
}

function parseEnvironmentParam(): EnvironmentType {
  if (typeof window === "undefined") return "DAY";
  const raw = new URLSearchParams(window.location.search).get("env")?.toUpperCase();
  return ENVIRONMENT_ORDER.includes(raw as EnvironmentType) ? (raw as EnvironmentType) : "DAY";
}

function parseSessionIdParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("sessionId");
}

function updateGameUrl(
  envType: EnvironmentType,
  sessionId: string | null,
  levelNumber: number | null
): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (levelNumber !== null) {
    params.set("level", String(levelNumber));
  } else {
    params.set("env", envType);
  }
  if (sessionId) params.set("sessionId", sessionId);
  window.history.replaceState(null, "", `/game?${params.toString()}`);
}

type PersistenceState = "connecting" | "db" | "loaded" | "saving" | "saved" | "local" | "error" | "choosing";

const PERSISTENCE_LABELS: Record<PersistenceState, string> = {
  connecting: "Loading",
  db: "Cloud",
  loaded: "Loaded",
  saving: "Saving",
  saved: "Saved",
  local: "Local",
  error: "Save failed",
  choosing: "Pick seeds",
};

type Phase = "loading" | "choosing" | "playing";

export default function GamePage() {
  const [activeEnvironment, setActiveEnvironment] = useState<EnvironmentType>("DAY");
  const [activeLevelNumber, setActiveLevelNumber] = useState<number | null>(null);
  const [shovelSelected, setShovelSelected] = useState(false);
  const [rewardPlantId, setRewardPlantId] = useState<string | null>(null);
  const [routeReady, setRouteReady] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [persistenceState, setPersistenceState] = useState<PersistenceState>("connecting");
  const [phase, setPhase] = useState<Phase>("loading");
  const [levelMeta, setLevelMeta] = useState<LevelConfigResult["level"] | null>(null);
  const [availablePlants, setAvailablePlants] = useState<AvailablePlant[]>([]);
  const [seedSlots, setSeedSlots] = useState(6);
  const [selectedPlantTypes, setSelectedPlantTypes] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pendingWaveConfig = useRef<unknown>(null);
  const pendingEnv = useRef<EnvironmentConfig | null>(null);
  const victoryHandled = useRef(false);

  const status = useGameStore((s) => s.status);
  const selectedSlot = useGameStore((s) => s.selectedSlot);
  const loadout = useGameStore((s) => s.loadout);

  // Auth gate
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) window.location.replace("/login");
    });
  }, []);

  useEffect(() => {
    const levelNum = parseLevelParam();
    setActiveLevelNumber(levelNum);
    if (!levelNum) setActiveEnvironment(parseEnvironmentParam());
    setRouteReady(true);
  }, []);

  /**
   * Fast load path:
   * - If sessionId in URL → resume that session only (1 request)
   * - Else if level → fetch level-config only, open seed chooser (1 request)
   * - Else freeplay → seed chooser with freeplay plants (no wait)
   * Session create happens only on "Let's Rock!"
   */
  const prepareLevel = useCallback(
    async (options: {
      levelNumber: number | null;
      envType: EnvironmentType;
      preferredSessionId?: string | null;
      forceNew?: boolean;
      isCancelled?: () => boolean;
    }) => {
      const isCancelled = options.isCancelled ?? (() => false);
      const levelNum = options.levelNumber;
      const preferredSessionId = options.forceNew ? null : options.preferredSessionId ?? null;

      setPhase("loading");
      setPersistenceState("connecting");
      setLoadError(null);
      victoryHandled.current = false;
      setShovelSelected(false);

      try {
        // Resume mid-game session without chooser
        if (preferredSessionId) {
          const loaded = await loadGameSession(preferredSessionId);
          if (isCancelled()) return;

          const loadedEnv = loaded.state.environment?.type ?? options.envType;
          useGameStore.setState({
            ...loaded.state,
            status: loaded.session.status === "PAUSED" ? "paused" : "playing",
            selectedSlot: null,
          });
          setCurrentSessionId(loaded.session.id);
          setPersistenceState(loaded.session.status === "PAUSED" ? "loaded" : "db");
          setActiveEnvironment(loadedEnv);
          setPhase("playing");
          updateGameUrl(loadedEnv, loaded.session.id, levelNum);
          return;
        }

        if (levelNum !== null) {
          const levelConfig = await fetchLevelConfig(levelNum);
          if (isCancelled()) return;

          const lvl = levelConfig.level;
          const env: EnvironmentConfig = {
            type: lvl.environmentType,
            gridRows: lvl.gridRows,
            gridCols: lvl.gridCols,
            waterLaneIndices: lvl.waterLaneIndices,
            gravesEnabled: lvl.gravesEnabled,
            fogEnabled: lvl.fogEnabled,
            slopeEnabled: lvl.slopeEnabled,
            conveyorBelt: lvl.conveyorBelt,
            skyDropSun: lvl.skyDropSun,
          };

          pendingEnv.current = env;
          pendingWaveConfig.current = lvl.waveConfig;
          setLevelMeta(lvl);
          setRewardPlantId(lvl.rewardPlantId);
          setActiveEnvironment(lvl.environmentType);
          setSeedSlots(levelConfig.seedSlots ?? lvl.seedSlots);

          const available = (levelConfig.availablePlants?.length
            ? levelConfig.availablePlants
            : levelConfig.loadout) as AvailablePlant[];
          setAvailablePlants(available);

          // Early levels: auto-select all when plant count ≤ seed slots
          const slots = levelConfig.seedSlots ?? lvl.seedSlots;
          if (available.length <= slots) {
            setSelectedPlantTypes(available.map((p) => p.plantType));
          } else {
            // Prefer peashooter + sunflower when present
            const preferred = ["PEASHOOTER", "SUNFLOWER", "SUN_SHROOM", "PUFF_SHROOM"];
            const auto: string[] = [];
            for (const t of preferred) {
              if (available.some((p) => p.plantType === t) && auto.length < slots) auto.push(t);
            }
            for (const p of available) {
              if (auto.length >= slots) break;
              if (!auto.includes(p.plantType)) auto.push(p.plantType);
            }
            setSelectedPlantTypes(auto);
          }

          // Warm idle board under the chooser
          useGameStore.getState().initGame(env, [], { waveConfig: lvl.waveConfig });
          setPhase("choosing");
          setPersistenceState("choosing");
          updateGameUrl(env.type, null, levelNum);
          return;
        }

        // Freeplay environment
        const env = ENVIRONMENTS[options.envType];
        pendingEnv.current = env;
        pendingWaveConfig.current = null;
        setLevelMeta(null);
        setRewardPlantId(null);
        const freeTypes = FREEPLAY_LOADOUTS[options.envType];
        const freeSlots = freeTypes.map((plantType, index) => {
          const def = getPlantDef(plantType);
          return {
            plantType,
            plantId: plantType.toLowerCase().replace(/_/g, "-"),
            displayName: toTitleCase(plantType),
            sunCost: def.sunCost,
            cooldownRemainingMs: 0,
            cooldownTotalMs: def.rechargeTime * 1000,
            isSelected: false,
            slotIndex: index,
          } satisfies AvailablePlant;
        });
        setAvailablePlants(freeSlots);
        setSeedSlots(Math.min(7, freeSlots.length));
        setSelectedPlantTypes(freeTypes.slice(0, Math.min(7, freeTypes.length)));
        useGameStore.getState().initGame(env, []);
        setPhase("choosing");
        setPersistenceState("choosing");
        setActiveEnvironment(options.envType);
        updateGameUrl(options.envType, null, null);
      } catch (err) {
        console.warn("[GamePage] prepare failed", err);
        if (isCancelled()) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load level");
        // Local fallback chooser for freeplay only
        const env = ENVIRONMENTS[options.envType];
        pendingEnv.current = env;
        const freeTypes = FREEPLAY_LOADOUTS[options.envType];
        setAvailablePlants(
          freeTypes.map((plantType, index) => {
            const def = getPlantDef(plantType);
            return {
              plantType,
              plantId: plantType,
              displayName: toTitleCase(plantType),
              sunCost: def.sunCost,
              cooldownRemainingMs: 0,
              cooldownTotalMs: def.rechargeTime * 1000,
              isSelected: false,
              slotIndex: index,
            };
          })
        );
        setSeedSlots(freeTypes.length);
        setSelectedPlantTypes(freeTypes);
        useGameStore.getState().initGame(env, []);
        setPhase("choosing");
        setPersistenceState("local");
      }
    },
    []
  );

  useEffect(() => {
    if (!routeReady) return;
    let cancelled = false;
    void prepareLevel({
      levelNumber: activeLevelNumber,
      envType: activeLevelNumber ? "DAY" : activeEnvironment,
      preferredSessionId: parseSessionIdParam(),
      isCancelled: () => cancelled,
    });
    return () => {
      cancelled = true;
    };
    // Only re-run when route/level identity changes — not on env toggle during freeplay mid-chooser
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevelNumber, routeReady, prepareLevel]);

  // Freeplay environment switch while not mid-level
  function switchEnvironment(envType: EnvironmentType) {
    if (envType === activeEnvironment || activeLevelNumber !== null) return;
    setCurrentSessionId(null);
    setActiveEnvironment(envType);
    void prepareLevel({ levelNumber: null, envType, forceNew: true });
  }

  function handleTogglePlant(plantType: string) {
    setSelectedPlantTypes((prev) => {
      if (prev.includes(plantType)) {
        return prev.filter((t) => t !== plantType);
      }
      if (prev.length >= seedSlots) return prev;
      return [...prev, plantType];
    });
  }

  async function handleStartGame() {
    if (selectedPlantTypes.length === 0 || starting) return;
    setStarting(true);
    setLoadError(null);

    const env = pendingEnv.current ?? ENVIRONMENTS[activeEnvironment];
    const slots = makeLoadoutFromTypes(selectedPlantTypes);
    const waveConfig = pendingWaveConfig.current;

    try {
      // Create session in parallel with local start for snappier UX
      const createPromise =
        activeLevelNumber !== null
          ? createGameSession(env.type, selectedPlantTypes, { levelNumber: activeLevelNumber })
          : createGameSession(env.type, selectedPlantTypes);

      useGameStore.getState().initGame(env, slots, { waveConfig });
      useGameStore.getState().startGame();
      setPhase("playing");
      setPersistenceState("connecting");

      try {
        const created = await createPromise;
        setCurrentSessionId(created.sessionId);
        setPersistenceState("db");
        updateGameUrl(env.type, created.sessionId, activeLevelNumber);
      } catch (err) {
        console.warn("[GamePage] session create failed, playing local", err);
        setCurrentSessionId(null);
        setPersistenceState("local");
        updateGameUrl(env.type, null, activeLevelNumber);
      }
    } finally {
      setStarting(false);
    }
  }

  // Victory complete
  useEffect(() => {
    if (status !== "victory" || victoryHandled.current) return;
    victoryHandled.current = true;
    if (!currentSessionId) return;

    const gameState = useGameStore.getState();
    void completeGameSession(currentSessionId, {
      score: gameState.score,
      totalZombiesKilled: gameState.totalZombiesKilled,
      waveNumber: gameState.waveNumber,
      gameTimeMs: gameState.gameTimeMs,
    }).catch((err) => {
      console.warn("[GamePage] Failed to record victory", err);
    });
  }, [status, currentSessionId]);

  useGameLoop();

  async function handlePauseSave() {
    const store = useGameStore.getState();
    store.pauseGame();

    if (!currentSessionId) {
      setPersistenceState("local");
      return;
    }

    setPersistenceState("saving");
    try {
      await saveGameSession(currentSessionId, serializeGameState(useGameStore.getState()));
      setPersistenceState("saved");
    } catch (err) {
      console.error("[GamePage] Failed to save session", err);
      setPersistenceState("error");
    }
  }

  async function handleResume() {
    useGameStore.getState().resumeGame();
    setPersistenceState(currentSessionId ? "db" : "local");
  }

  function handleShovelToggle() {
    setShovelSelected((prev) => {
      if (!prev) useGameStore.getState().selectSlot(null);
      return !prev;
    });
  }

  function handleCellClick(col: number, row: number) {
    if (phase !== "playing") return;
    const store = useGameStore.getState();

    if (shovelSelected) {
      store.shovePlant(row, col);
      setShovelSelected(false);
      return;
    }

    if (store.selectedSlot === null) return;
    const slot = store.loadout[store.selectedSlot];
    if (!slot) return;
    const placed = store.placePlant(slot.plantType, row, col);
    if (placed) store.selectSlot(null);
  }

  function handleSunClick(col: number, row: number) {
    if (phase !== "playing") return;
    const store = useGameStore.getState();
    for (const [dropId, drop] of Object.entries(store.sunDrops)) {
      const dropCol = Math.floor(drop.x);
      const dropRow = Math.floor(drop.y);
      if (dropCol === col && dropRow === row) {
        store.collectSunDrop(dropId);
        return;
      }
    }
    handleCellClick(col, row);
  }

  const isGameOver = status === "game-over";
  const isVictory = status === "victory";
  const showOverlay = phase === "playing" && (isGameOver || isVictory);
  const inChooser = phase === "choosing";
  const showPlayUi = phase === "playing";

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "radial-gradient(circle at center, #143615 0%, #071608 64%, #030b04 100%)",
        fontFamily: "sans-serif",
        overflow: "hidden",
      }}
    >
      <GameHUD
        onPauseRequest={handlePauseSave}
        onResumeRequest={handleResume}
        persistenceLabel={PERSISTENCE_LABELS[persistenceState]}
        showWaveBar={showPlayUi}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "14px 18px 16px",
          position: "relative",
          overflow: "auto",
        }}
      >
        {activeLevelNumber === null && phase !== "loading" && (
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              width: "min(100%, 1080px)",
            }}
          >
            {ENVIRONMENT_ORDER.map((envType) => {
              const selected = envType === activeEnvironment;
              return (
                <button
                  key={envType}
                  onClick={() => switchEnvironment(envType)}
                  disabled={phase === "playing"}
                  style={{
                    minWidth: 84,
                    height: 34,
                    border: selected ? "2px solid #ffe56a" : "1px solid rgba(218, 245, 176, 0.28)",
                    borderRadius: 7,
                    background: selected ? "rgba(255, 213, 74, 0.22)" : "rgba(20, 48, 22, 0.72)",
                    color: selected ? "#fff5a6" : "#cfeab8",
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: phase === "playing" ? "not-allowed" : "pointer",
                    opacity: phase === "playing" ? 0.5 : 1,
                    boxShadow: selected ? "0 0 16px rgba(255, 220, 74, 0.2)" : "none",
                  }}
                >
                  {ENVIRONMENT_LABELS[envType].icon} {ENVIRONMENT_LABELS[envType].label}
                </button>
              );
            })}
          </div>
        )}

        {activeLevelNumber !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#86efac",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <Link href="/" style={{ color: "#9ca3af", textDecoration: "none", fontSize: 12 }}>
              ← Levels
            </Link>
            <span style={{ color: "#2a5a0a" }}>|</span>
            <span>Level {activeLevelNumber}{levelMeta?.name ? ` · ${levelMeta.name}` : ""}</span>
          </div>
        )}

        {phase === "loading" && (
          <div style={{ color: "#adffa0", fontSize: 16, fontWeight: 700, padding: 40 }}>
            Loading level…
          </div>
        )}

        {loadError && phase === "choosing" && (
          <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 4 }}>{loadError}</div>
        )}

        {inChooser && (
          <SeedChooser
            levelName={
              levelMeta?.name ??
              (activeLevelNumber ? `Level ${activeLevelNumber}` : `${ENVIRONMENT_LABELS[activeEnvironment].label} Freeplay`)
            }
            briefingText={levelMeta?.briefingText ?? null}
            seedSlots={seedSlots}
            availablePlants={availablePlants}
            selectedPlantTypes={selectedPlantTypes}
            onToggle={handleTogglePlant}
            onStart={() => void handleStartGame()}
            starting={starting}
          />
        )}

        {showPlayUi && selectedSlot !== null && !showOverlay && (
          <div
            style={{
              width: "min(100%, 1080px)",
              minHeight: 20,
              display: "flex",
              justifyContent: "center",
              color: "#f5dd7a",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            <span>🌱 {toTitleCase(loadout[selectedSlot]?.plantType ?? "")}</span>
          </div>
        )}

        {showPlayUi && (
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <GameCanvas onCellClick={handleSunClick} shovelMode={shovelSelected} />

            {showOverlay && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 24,
                  pointerEvents: "auto",
                  background: "rgba(0,0,0,0.75)",
                  backdropFilter: "blur(3px)",
                }}
              >
                <h1
                  style={{
                    fontSize: 56,
                    fontWeight: "bold",
                    color: isVictory ? "#ffd700" : "#ff4444",
                    textShadow: "0 0 20px rgba(0,0,0,0.8)",
                    margin: 0,
                  }}
                >
                  {isVictory ? "YOU WIN!" : "GAME OVER"}
                </h1>

                {isVictory && rewardPlantId && (
                  <p style={{ color: "#adffa0", fontSize: 18, margin: 0 }}>
                    Unlocked: {toTitleCase(rewardPlantId)}
                  </p>
                )}

                <div style={{ display: "flex", gap: 16 }}>
                  <button
                    onClick={() => {
                      setCurrentSessionId(null);
                      void prepareLevel({
                        levelNumber: activeLevelNumber,
                        envType: activeEnvironment,
                        forceNew: true,
                      });
                    }}
                    style={{
                      background: "#2a7a2a",
                      color: "#e0ffe0",
                      border: "2px solid #4aaa4a",
                      borderRadius: 8,
                      padding: "12px 28px",
                      fontSize: 18,
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Play Again
                  </button>
                  <Link
                    href="/"
                    style={{
                      background: "#2a2a5a",
                      color: "#c0c0ff",
                      border: "2px solid #4a4aaa",
                      borderRadius: 8,
                      padding: "12px 28px",
                      fontSize: 18,
                      fontWeight: "bold",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    Main Menu
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showPlayUi && (
        <SeedPacketBar shovelSelected={shovelSelected} onShovelToggle={handleShovelToggle} />
      )}
    </main>
  );
}
