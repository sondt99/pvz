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
export const ROOF_STRAIGHT_PROJECTILE_BLOCKED_COLS = 4;

export const ZOMBIE_SPAWN_X = 9.5; // tiles off-screen right

export const LAWN_MOWER_READY_X = -0.78;
export const LAWN_MOWER_TRIGGER_X = -0.5;
export const LAWN_MOWER_SPEED_COLS_PER_SEC = 6;

export const WAVE_INTERVAL_MS = 30_000;
export const FINAL_WAVE_DELAY_MS = 10_000;

export const SUNFLOWER_PRODUCE_INTERVAL_MS = 24_000;
export const SUN_PRODUCER_INITIAL_DELAY_MS = 7_000;
export const SUNSHROOM_PRODUCE_INTERVAL_MS = 24_000;
export const SUNSHROOM_SMALL_VALUE = 15;
export const SUNSHROOM_MEDIUM_VALUE = 25;
export const SUNSHROOM_LARGE_VALUE = 50;

export const PUFF_SHROOM_RANGE_COLS = 3;
export const SEA_SHROOM_RANGE_COLS = 3;
export const FUME_SHROOM_RANGE_COLS = 4;
export const SCAREDY_SHROOM_COWER_LANES = 1;
export const SCAREDY_SHROOM_COWER_COLS = 1;
export const FIRE_PEA_DAMAGE_MULTIPLIER = 2;
export const KERNEL_PULT_BUTTER_CHANCE = 0.25;
export const KERNEL_PULT_BUTTER_DAMAGE = 40;
export const KERNEL_PULT_BUTTER_STUN_MS = 5_000;
export const DOLPHIN_RIDER_POST_JUMP_SPEED_COLS_PER_SEC = 1 / 4.7;
export const DIGGER_EMERGE_X = 0.15;
export const DIGGER_EMERGE_PAUSE_MS = 5_000;
export const DIGGER_EMERGED_SPEED_COLS_PER_SEC = 1 / 6.2;
export const POGO_WITHOUT_STICK_SPEED_COLS_PER_SEC = 1 / 4.7;
export const GARGANTUAR_IMP_THROW_HEALTH_THRESHOLD = 1500;
export const GARGANTUAR_IMP_THROW_MIN_X = 6;
export const GARGANTUAR_IMP_LANDING_MIN_X = 1;
export const GARGANTUAR_IMP_LANDING_MAX_X = 3;
export const GARGANTUAR_SMASH_RECOVERY_MS = 1_500;

export const POTATO_MINE_ARM_MS = 14_000;
export const DOOM_SHROOM_RADIUS_LANES = 2;
export const DOOM_SHROOM_RADIUS_COLS = 3.5;
export const DOOM_SHROOM_CRATER_MS = 180_000;

export const MAGNET_SHROOM_RANGE_COLS = 2.5;
export const MAGNET_SHROOM_RANGE_LANES = 1;
// Zombie types whose armor is magnetic and can be stripped by Magnet-shroom.
// Conehead is a traffic cone (plastic) and is NOT magnetic.
export const MAGNETIC_ZOMBIE_TYPES = new Set([
  "BUCKETHEAD",
  "SCREEN_DOOR",
  "FOOTBALL",
  "LADDER",
]);

export const MAX_DELTA_MS = 100; // cap delta to avoid spiral-of-death
