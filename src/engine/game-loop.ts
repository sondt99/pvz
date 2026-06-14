import { MAX_DELTA_MS } from "./constants";

type TickCallback = (deltaMs: number) => void;

/**
 * A requestAnimationFrame-based game loop.
 *
 * Delta time is capped at MAX_DELTA_MS (100 ms) to prevent the spiral-of-death
 * when the tab is backgrounded or the device is slow.
 */
export class GameLoop {
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;
  private _paused = false;
  private readonly onTick: TickCallback;

  constructor(onTick: TickCallback) {
    this.onTick = onTick;
  }

  get isPaused(): boolean {
    return this._paused;
  }

  get isRunning(): boolean {
    return this.rafId !== null;
  }

  start(): void {
    if (this.rafId !== null) return;
    this._paused = false;
    this.lastTimestamp = null;
    this.scheduleFrame();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTimestamp = null;
    this._paused = false;
  }

  pause(): void {
    this._paused = true;
  }

  resume(): void {
    if (!this._paused) return;
    this._paused = false;
    this.lastTimestamp = null; // reset to avoid delta spike on resume
  }

  private scheduleFrame(): void {
    this.rafId = requestAnimationFrame((timestamp: number) => {
      if (this._paused) {
        this.scheduleFrame();
        return;
      }
      if (this.lastTimestamp !== null) {
        const rawDelta = timestamp - this.lastTimestamp;
        const delta = Math.min(rawDelta, MAX_DELTA_MS);
        this.onTick(delta);
      }
      this.lastTimestamp = timestamp;
      this.scheduleFrame();
    });
  }
}

export function createGameLoop(tick: TickCallback): GameLoop {
  return new GameLoop(tick);
}
