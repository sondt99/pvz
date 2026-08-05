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

// PvZ-like pacing: first wave after sun-setup, then min gap between wave *starts*.
// Next wave also waits until the previous wave finished spawning and the lawn is mostly clear.
export const FIRST_WAVE_AT_MS = 25_000;
export const WAVE_INTERVAL_MS = 50_000;
/** Extra rest after the last zombie of a wave is queued before the next wave may start. */
export const WAVE_REST_AFTER_SPAWN_MS = 12_000;
/** Normal waves may start when this many living zombies remain (or fewer). */
export const WAVE_ADVANCE_MAX_REMAINING = 1;
/** Flag / final waves wait for a full clear. */
export const WAVE_FLAG_ADVANCE_MAX_REMAINING = 0;
export const FINAL_WAVE_DELAY_MS = 15_000;

export const SUNFLOWER_PRODUCE_INTERVAL_MS = 24_000;
export const SUN_PRODUCER_INITIAL_DELAY_MS = 7_000;
export const SUNSHROOM_PRODUCE_INTERVAL_MS = 24_000;
// PvZ1: small Sun-shroom drops 15 sun; after growing it drops normal 25 sun (never 50).
export const SUNSHROOM_SMALL_VALUE = 15;
export const SUNSHROOM_LARGE_VALUE = 25;

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
/** Pole Vaulting Zombie walks at basic speed after losing the pole. */
export const POLE_VAULT_POST_JUMP_SPEED_COLS_PER_SEC = 1 / 4.7;
/** Wall-nut Bowling roll speed (cols per second, toward the right). */
export const BOWLING_NUT_SPEED_COLS_PER_SEC = 3.2;
/** Wall-nut bowling hit damage (one-shots NORMAL). */
export const BOWLING_NUT_DAMAGE = 200;
/** Explode-o-nut bowling damage (instant kill most early zombies). */
export const BOWLING_EXPLODE_DAMAGE = 1800;
/** Conveyor default interval if level omits one. */
export const CONVEYOR_DEFAULT_INTERVAL_MS = 3_500;
/** Huge-wave banner display duration. */
export const HUGE_WAVE_BANNER_MS = 3_500;
export const DIGGER_EMERGE_X = 0.15;
export const DIGGER_EMERGE_PAUSE_MS = 5_000;
export const DIGGER_EMERGED_SPEED_COLS_PER_SEC = 1 / 6.2;
export const POGO_WITHOUT_STICK_SPEED_COLS_PER_SEC = 1 / 4.7;
export const GARGANTUAR_IMP_THROW_HEALTH_THRESHOLD = 1500;
export const GARGANTUAR_IMP_THROW_MIN_X = 6;
export const GARGANTUAR_IMP_LANDING_MIN_X = 1;
export const GARGANTUAR_IMP_LANDING_MAX_X = 3;
export const GARGANTUAR_SMASH_RECOVERY_MS = 1_500;

// PvZ1 Potato Mine arms in ~15 seconds.
export const POTATO_MINE_ARM_MS = 15_000;
export const DOOM_SHROOM_RADIUS_LANES = 2;
export const DOOM_SHROOM_RADIUS_COLS = 3.5;
export const DOOM_SHROOM_CRATER_MS = 180_000;

export const MAGNET_SHROOM_RANGE_COLS = 2.5;
export const MAGNET_SHROOM_RANGE_LANES = 1;
// PvZ1 Magnet-shroom recharges ~15s between pulls.
export const MAGNET_SHROOM_COOLDOWN_MS = 15_000;
// PvZ1 Ice-shroom freezes ~4s, then leaves residual chill (half speed).
export const ICE_SHROOM_FREEZE_MS = 4_000;
export const ICE_SHROOM_CHILL_MS = 6_000;
export const GRAVE_BUSTER_DURATION_MS = 4_000;
// Marigold coin production (coins are score in this port; not sun).
export const MARIGOLD_COIN_INTERVAL_MS = 24_000;
export const MARIGOLD_SILVER_COIN_SCORE = 10;
export const MARIGOLD_GOLD_COIN_SCORE = 50;
export const MARIGOLD_GOLD_CHANCE = 0.1;
// Zombie types whose armor is magnetic and can be stripped by Magnet-shroom.
// Conehead is a traffic cone (plastic) and is NOT magnetic.
export const MAGNETIC_ZOMBIE_TYPES = new Set([
  "BUCKETHEAD",
  "SCREEN_DOOR",
  "FOOTBALL",
  "LADDER",
]);

// Bungee zombie drops and grabs a plant 2 seconds after spawning.
export const BUNGEE_GRAB_DELAY_MS = 2_000;
// Umbrella Leaf protects a 3×3 area (plant tile ± 1 in each direction).
export const UMBRELLA_LEAF_RADIUS_COLS = 1;
export const UMBRELLA_LEAF_RADIUS_LANES = 1;
// Catapult fires a basketball every 3 seconds when a plant is in range.
export const CATAPULT_FIRE_INTERVAL_MS = 3_000;
export const CATAPULT_FIRE_RANGE_COLS = 7; // max look-ahead distance
export const CATAPULT_BASKETBALL_DAMAGE = 40;

export const MAX_DELTA_MS = 100; // cap delta to avoid spiral-of-death

// PvZ1: Puff-shroom and Marigold do NOT expire on a timer.
// Sun-shroom grows after ~2 minutes (or after several small productions).
export const SUNSHROOM_GROW_MS = 120_000; // small (15) → large (25)

// Newspaper Zombie "hungry" speed after newspaper is destroyed (~2× normal)
export const NEWSPAPER_ENRAGED_SPEED_COLS_PER_SEC = (1 / 4.7) * 2;

// Dancing Zombie calls backup dancers when it crosses this x position
export const DANCING_ZOMBIE_CALL_X = 7.0;

// Jack-in-the-Box random explosion timer range (ms after spawn)
export const JACK_IN_THE_BOX_MIN_EXPLODE_MS = 7_000;
export const JACK_IN_THE_BOX_MAX_EXPLODE_MS = 25_000;
