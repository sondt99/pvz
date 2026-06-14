export const GRID_COLS = 9;
export const GRID_ROWS_STANDARD = 5;
export const GRID_ROWS_POOL = 6;

export const TILE_W = 92; // pixels per tile
export const TILE_H = 88;

export const SKY_SUN_INTERVAL_MS = 7_000; // Day: sun every 7 s
export const SKY_SUN_FALL_SPEED_PER_MS = 0.001; // row-units per ms

export const SUN_LIFETIME_MS = 9_000; // auto-disappear after landing
export const SUN_VALUE_SKY = 25;
export const SUN_VALUE_SUNFLOWER = 25;

export const FOG_START_COL = 5; // columns ≥ 5 are fogged

export const ZOMBIE_SPAWN_X = 9.5; // tiles off-screen right

export const WAVE_INTERVAL_MS = 30_000;
export const FINAL_WAVE_DELAY_MS = 10_000;

export const SUNFLOWER_PRODUCE_INTERVAL_MS = 24_000;
export const SUN_PRODUCER_INITIAL_DELAY_MS = 7_000;
export const SUNSHROOM_PRODUCE_INTERVAL_MS = 24_000;
export const SUNSHROOM_SMALL_VALUE = 15;
export const SUNSHROOM_MEDIUM_VALUE = 25;
export const SUNSHROOM_LARGE_VALUE = 50;

export const POTATO_MINE_ARM_MS = 14_000;

export const MAX_DELTA_MS = 100; // cap delta to avoid spiral-of-death
