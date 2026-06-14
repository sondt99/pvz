-- CreateEnum
CREATE TYPE "LevelMode" AS ENUM ('ADVENTURE', 'MINI_GAME', 'PUZZLE', 'SURVIVAL', 'ENDLESS');

-- CreateEnum
CREATE TYPE "PlantCategory" AS ENUM ('RESOURCE', 'SHOOTER', 'LOBBER', 'DEFENSE', 'MELEE', 'INSTANT', 'SUPPORT', 'AQUATIC', 'PLATFORM', 'CONTROL');

-- CreateEnum
CREATE TYPE "ZombieCategory" AS ENUM ('BASIC', 'ARMORED', 'FAST', 'BYPASSER', 'AQUATIC', 'AERIAL', 'BOSS', 'SPECIAL');

-- CreateEnum
CREATE TYPE "ProjectileMotion" AS ENUM ('STRAIGHT', 'LOBBED', 'ARCING', 'SPLASH', 'INSTANT', 'NONE');

-- AlterTable
ALTER TABLE "levels"
ADD COLUMN "gameMode" "LevelMode" NOT NULL DEFAULT 'ADVENTURE',
ADD COLUMN "difficulty" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "gridRows" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "gridCols" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN "waterLaneIndices" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "gravesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "fogEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "slopeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "conveyorBelt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "skyDropSun" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "startingSun" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "seedSlots" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN "allowedPlantIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "bannedPlantIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "rewardPlantId" TEXT,
ADD COLUMN "environmentConfig" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "waveConfig" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "ruleConfig" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_levels"
ADD COLUMN "bestTimeMs" INTEGER,
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "highestWave" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "unlockedAt" TIMESTAMP(3),
ADD COLUMN "lastPlayedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "seed_packets"
ALTER COLUMN "plantType" DROP NOT NULL,
ADD COLUMN "category" "PlantCategory" NOT NULL DEFAULT 'SUPPORT',
ADD COLUMN "behaviorKey" TEXT,
ADD COLUMN "projectileType" "ProjectileType",
ADD COLUMN "maxStack" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "unlockLevelNumber" INTEGER,
ADD COLUMN "placementRules" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "targetingRules" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "requiresFlowerPot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "zombie_definitions" (
    "zombieId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "zombieType" "ZombieType",
    "category" "ZombieCategory" NOT NULL DEFAULT 'BASIC',
    "baseHealth" INTEGER NOT NULL,
    "armorHealth" INTEGER NOT NULL DEFAULT 0,
    "speedColsPerSec" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "eatDamagePerSec" INTEGER NOT NULL DEFAULT 100,
    "spawnWeight" INTEGER NOT NULL DEFAULT 1,
    "abilities" JSONB NOT NULL DEFAULT '{}',
    "environmentRules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zombie_definitions_pkey" PRIMARY KEY ("zombieId")
);

-- CreateTable
CREATE TABLE "projectile_definitions" (
    "projectileId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "projectileType" "ProjectileType",
    "motionType" "ProjectileMotion" NOT NULL DEFAULT 'STRAIGHT',
    "damage" INTEGER NOT NULL DEFAULT 20,
    "speedTilesPerSec" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "splashRadius" DOUBLE PRECISION,
    "effects" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projectile_definitions_pkey" PRIMARY KEY ("projectileId")
);

-- AlterTable
ALTER TABLE "user_seed_packets"
ADD COLUMN "unlockSource" TEXT,
ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastUsedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "game_sessions"
ALTER COLUMN "waterLaneIndices" SET DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "saveSchemaVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "gameMode" "LevelMode" NOT NULL DEFAULT 'ADVENTURE',
ADD COLUMN "skyDropSun" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "startingSun" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "rngSeed" TEXT,
ADD COLUMN "environmentConfig" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "gameTimeMs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "currentFlagIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "environmentState" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "graveState" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "projectileState" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "sunDropState" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "lawnMowerState" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "spawnQueueState" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "levels_environmentType_idx" ON "levels"("environmentType");

-- CreateIndex
CREATE INDEX "levels_gameMode_idx" ON "levels"("gameMode");

-- CreateIndex
CREATE INDEX "levels_rewardPlantId_idx" ON "levels"("rewardPlantId");

-- CreateIndex
CREATE INDEX "seed_packets_category_idx" ON "seed_packets"("category");

-- CreateIndex
CREATE INDEX "seed_packets_isNightOnly_idx" ON "seed_packets"("isNightOnly");

-- CreateIndex
CREATE INDEX "seed_packets_isAquatic_idx" ON "seed_packets"("isAquatic");

-- CreateIndex
CREATE UNIQUE INDEX "zombie_definitions_zombieType_key" ON "zombie_definitions"("zombieType");

-- CreateIndex
CREATE INDEX "zombie_definitions_category_idx" ON "zombie_definitions"("category");

-- CreateIndex
CREATE INDEX "zombie_definitions_spawnWeight_idx" ON "zombie_definitions"("spawnWeight");

-- CreateIndex
CREATE UNIQUE INDEX "projectile_definitions_projectileType_key" ON "projectile_definitions"("projectileType");

-- CreateIndex
CREATE INDEX "projectile_definitions_motionType_idx" ON "projectile_definitions"("motionType");

-- CreateIndex
CREATE UNIQUE INDEX "user_seed_packets_userId_loadoutSlot_key" ON "user_seed_packets"("userId", "loadoutSlot");

-- CreateIndex
CREATE INDEX "user_seed_packets_plantId_idx" ON "user_seed_packets"("plantId");

-- CreateIndex
CREATE INDEX "game_sessions_userId_levelNumber_idx" ON "game_sessions"("userId", "levelNumber");

-- CreateIndex
CREATE INDEX "game_sessions_status_lastSavedAt_idx" ON "game_sessions"("status", "lastSavedAt");

-- AddForeignKey
ALTER TABLE "levels" ADD CONSTRAINT "levels_rewardPlantId_fkey" FOREIGN KEY ("rewardPlantId") REFERENCES "seed_packets"("plantId") ON DELETE SET NULL ON UPDATE CASCADE;
