import type { ZombieDefinition } from "../types";

const BASIC_SPEED_COLS_PER_SEC = 1 / 4.7;
const FLAG_SPEED_COLS_PER_SEC = 1 / 4.3;
const SLOW_SPEED_COLS_PER_SEC = 1 / 6.2;
const FAST_SPEED_COLS_PER_SEC = 1 / 3.2;
const VERY_FAST_SPEED_COLS_PER_SEC = 1 / 2.4;
const STATIONARY_SPEED_COLS_PER_SEC = 0;

export const ZOMBIE_DEFINITIONS: Record<string, ZombieDefinition> = {
  NORMAL:          { zombieType: "NORMAL",          health: 200,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 100,  isAerial: false, isUnderground: false, isBoss: false },
  FLAG:            { zombieType: "FLAG",            health: 200,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: FLAG_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 100,  isAerial: false, isUnderground: false, isBoss: false },
  CONEHEAD:        { zombieType: "CONEHEAD",        health: 200,  armorHealth: 370,  armorLayers: 1, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 150,  isAerial: false, isUnderground: false, isBoss: false },
  BUCKETHEAD:      { zombieType: "BUCKETHEAD",      health: 200,  armorHealth: 1100, armorLayers: 1, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 200,  isAerial: false, isUnderground: false, isBoss: false },
  NEWSPAPER:       { zombieType: "NEWSPAPER",       health: 200,  armorHealth: 200,  armorLayers: 1, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 125,  isAerial: false, isUnderground: false, isBoss: false },
  SCREEN_DOOR:     { zombieType: "SCREEN_DOOR",     health: 200,  armorHealth: 1100, armorLayers: 1, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 200,  isAerial: false, isUnderground: false, isBoss: false },
  FOOTBALL:        { zombieType: "FOOTBALL",        health: 200,  armorHealth: 800,  armorLayers: 1, speedColsPerSec: FAST_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 250,  isAerial: false, isUnderground: false, isBoss: false },
  DANCING:         { zombieType: "DANCING",         health: 200,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 300,  isAerial: false, isUnderground: false, isBoss: false },
  BACKUP_DANCER:   { zombieType: "BACKUP_DANCER",   health: 100,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 100,  isAerial: false, isUnderground: false, isBoss: false },
  DUCKY_TUBE:      { zombieType: "DUCKY_TUBE",      health: 200,  armorHealth: 200,  armorLayers: 1, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 125,  isAerial: false, isUnderground: false, isBoss: false },
  SNORKEL:         { zombieType: "SNORKEL",         health: 200,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 150,  isAerial: false, isUnderground: false, isBoss: false },
  ZOMBONI:         { zombieType: "ZOMBONI",         health: 1800, armorHealth: 0,    armorLayers: 0, speedColsPerSec: FAST_SPEED_COLS_PER_SEC, eatDamagePerSec: 9999, scoreValue: 500,  isAerial: false, isUnderground: false, isBoss: false },
  BOBSLED:         { zombieType: "BOBSLED",         health: 250,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: VERY_FAST_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 250,  isAerial: false, isUnderground: false, isBoss: false },
  DOLPHIN_RIDER:   { zombieType: "DOLPHIN_RIDER",   health: 200,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: VERY_FAST_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 200,  isAerial: false, isUnderground: false, isBoss: false },
  JACK_IN_THE_BOX: { zombieType: "JACK_IN_THE_BOX", health: 200,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 200,  isAerial: false, isUnderground: false, isBoss: false },
  BALLOON:         { zombieType: "BALLOON",         health: 500,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: FAST_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 200,  isAerial: true,  isUnderground: false, isBoss: false },
  DIGGER:          { zombieType: "DIGGER",          health: 200,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: FAST_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 200,  isAerial: false, isUnderground: true,  isBoss: false },
  POGO:            { zombieType: "POGO",            health: 200,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: VERY_FAST_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 200,  isAerial: false, isUnderground: false, isBoss: false },
  YETI:            { zombieType: "YETI",            health: 1350, armorHealth: 0,    armorLayers: 0, speedColsPerSec: FAST_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 1000, isAerial: false, isUnderground: false, isBoss: false },
  BUNGEE:          { zombieType: "BUNGEE",          health: 200,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: STATIONARY_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 300,  isAerial: true,  isUnderground: false, isBoss: false },
  LADDER:          { zombieType: "LADDER",          health: 200,  armorHealth: 400,  armorLayers: 1, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 250,  isAerial: false, isUnderground: false, isBoss: false },
  CATAPULT:        { zombieType: "CATAPULT",        health: 200,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: SLOW_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 400,  isAerial: false, isUnderground: false, isBoss: false },
  GARGANTUAR:      { zombieType: "GARGANTUAR",      health: 3000, armorHealth: 0,    armorLayers: 0, speedColsPerSec: SLOW_SPEED_COLS_PER_SEC, eatDamagePerSec: 1800, scoreValue: 1000, isAerial: false, isUnderground: false, isBoss: true  },
  IMP:             { zombieType: "IMP",             health: 100,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: VERY_FAST_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 50,   isAerial: false, isUnderground: false, isBoss: false },
  DR_ZOMBIE:       { zombieType: "DR_ZOMBIE",       health: 200,  armorHealth: 0,    armorLayers: 0, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100,  scoreValue: 200,  isAerial: false, isUnderground: false, isBoss: false },
  PEASHOOTER_ZOMBIE:  { zombieType: "PEASHOOTER_ZOMBIE",  health: 200,  armorHealth: 0, armorLayers: 0, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100, scoreValue: 250, isAerial: false, isUnderground: false, isBoss: false },
  WALL_NUT_ZOMBIE:    { zombieType: "WALL_NUT_ZOMBIE",    health: 4000, armorHealth: 0, armorLayers: 0, speedColsPerSec: SLOW_SPEED_COLS_PER_SEC, eatDamagePerSec: 100, scoreValue: 300, isAerial: false, isUnderground: false, isBoss: false },
  JALAPENO_ZOMBIE:    { zombieType: "JALAPENO_ZOMBIE",    health: 200,  armorHealth: 0, armorLayers: 0, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100, scoreValue: 250, isAerial: false, isUnderground: false, isBoss: false },
  GATLING_PEA_ZOMBIE: { zombieType: "GATLING_PEA_ZOMBIE", health: 200,  armorHealth: 0, armorLayers: 0, speedColsPerSec: BASIC_SPEED_COLS_PER_SEC, eatDamagePerSec: 100, scoreValue: 300, isAerial: false, isUnderground: false, isBoss: false },
  SQUASH_ZOMBIE:      { zombieType: "SQUASH_ZOMBIE",      health: 300,  armorHealth: 0, armorLayers: 0, speedColsPerSec: FAST_SPEED_COLS_PER_SEC, eatDamagePerSec: 100, scoreValue: 250, isAerial: false, isUnderground: false, isBoss: false },
  TALL_NUT_ZOMBIE:    { zombieType: "TALL_NUT_ZOMBIE",    health: 8000, armorHealth: 0, armorLayers: 0, speedColsPerSec: SLOW_SPEED_COLS_PER_SEC, eatDamagePerSec: 100, scoreValue: 500, isAerial: false, isUnderground: false, isBoss: false },
};

export function getZombieDef(zombieType: string): ZombieDefinition {
  const def = ZOMBIE_DEFINITIONS[zombieType];
  if (!def) throw new Error(`Unknown zombie type: ${zombieType}`);
  return def;
}

export function getAllZombieTypes(): string[] {
  return Object.keys(ZOMBIE_DEFINITIONS);
}
