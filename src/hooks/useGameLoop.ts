"use client";

import { useEffect, useRef, useState } from "react";
import { GameLoop } from "@/engine/game-loop";
import { useGameStore } from "@/store/game-store";

interface UseGameLoopResult {
  isPaused: boolean;
  isRunning: boolean;
}

export function useGameLoop(): UseGameLoopResult {
  const status = useGameStore((s) => s.status);
  const loopRef = useRef<GameLoop | null>(null);
  const [loopState, setLoopState] = useState({ isPaused: false, isRunning: false });

  // Create the GameLoop once on mount, stop and destroy on unmount.
  useEffect(() => {
    const loop = new GameLoop((deltaMs) => {
      useGameStore.getState().tick(deltaMs);
    });
    loopRef.current = loop;

    return () => {
      loop.stop();
      loopRef.current = null;
    };
  }, []);

  // React to game status changes to start / pause / resume the loop.
  useEffect(() => {
    const loop = loopRef.current;
    if (!loop) return;

    if (status === "playing") {
      if (!loop.isRunning) {
        loop.start();
      } else if (loop.isPaused) {
        loop.resume();
      }
    } else if (status === "paused") {
      if (loop.isRunning && !loop.isPaused) {
        loop.pause();
      }
    } else {
      // idle, victory, game-over — stop the loop
      if (loop.isRunning) {
        loop.stop();
      }
    }

    setLoopState({ isPaused: loop.isPaused, isRunning: loop.isRunning });
  }, [status]);

  return loopState;
}
