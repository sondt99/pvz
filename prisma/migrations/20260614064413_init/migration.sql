-- CreateEnum
CREATE TYPE "EnvironmentType" AS ENUM ('DAY', 'NIGHT', 'POOL', 'FOG', 'ROOF');

-- CreateEnum
CREATE TYPE "LevelStatus" AS ENUM ('LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'COMPLETED', 'STAR_RATED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PLANT', 'ZOMBIE', 'PROJECTILE');

-- CreateEnum
CREATE TYPE "EntityLayer" AS ENUM ('GROUND', 'WATER', 'SKY', 'GRAVE', 'RAIL');

-- CreateEnum
CREATE TYPE "PlantType" AS ENUM ('PEASHOOTER', 'SUNFLOWER', 'CHERRY_BOMB', 'WALL_NUT', 'POTATO_MINE', 'SNOW_PEA', 'CHOMPER', 'REPEATER', 'PUFF_SHROOM', 'SUN_SHROOM', 'FUME_SHROOM', 'SCAREDY_SHROOM', 'ICE_SHROOM', 'DOOM_SHROOM', 'LILY_PAD', 'SQUASH', 'THREEPEATER', 'TANGLE_KELP', 'JALAPENO', 'SPIKEWEED', 'TORCHWOOD', 'TALL_NUT', 'SEA_SHROOM', 'PLANTERN', 'CACTUS', 'BLOVER', 'SPLIT_PEA', 'STARFRUIT', 'PUMPKIN', 'MAGNET_SHROOM', 'CABBAGE_PULT', 'FLOWER_POT', 'KERNEL_PULT', 'COFFEE_BEAN', 'GARLIC', 'UMBRELLA_LEAF', 'MARIGOLD', 'MELON_PULT');

-- CreateEnum
CREATE TYPE "ZombieType" AS ENUM ('NORMAL', 'FLAG', 'CONEHEAD', 'BUCKETHEAD', 'NEWSPAPER', 'SCREEN_DOOR', 'FOOTBALL', 'DANCING', 'BACKUP_DANCER', 'DUCKY_TUBE', 'SNORKEL', 'ZOMBONI', 'BOBSLED', 'DOLPHIN_RIDER', 'JACK_IN_THE_BOX', 'BALLOON', 'DIGGER', 'POGO', 'YETI', 'BUNGEE', 'LADDER', 'CATAPULT', 'GARGANTUAR', 'IMP', 'DR_ZOMBIE', 'PEASHOOTER_ZOMBIE', 'WALL_NUT_ZOMBIE', 'JALAPENO_ZOMBIE', 'GATLING_PEA_ZOMBIE', 'SQUASH_ZOMBIE', 'TALL_NUT_ZOMBIE');

-- CreateEnum
CREATE TYPE "ProjectileType" AS ENUM ('PEA', 'SNOW_PEA_PROJECTILE', 'CABBAGE', 'MELON', 'KERNEL', 'BUTTER', 'STAR', 'SPIKE', 'FIRE_PEA', 'SPLIT_PEA_BACK');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "levelNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "environmentType" "EnvironmentType" NOT NULL,
    "worldNumber" INTEGER NOT NULL,
    "stageNumber" INTEGER NOT NULL,
    "unlockRequirement" JSONB,
    "briefingText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("levelNumber")
);

-- CreateTable
CREATE TABLE "user_levels" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "status" "LevelStatus" NOT NULL DEFAULT 'LOCKED',
    "stars" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seed_packets" (
    "plantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "plantType" "PlantType" NOT NULL,
    "sunCost" INTEGER NOT NULL,
    "rechargeTime" INTEGER NOT NULL,
    "stats" JSONB,
    "isNightOnly" BOOLEAN NOT NULL DEFAULT false,
    "isMushroomType" BOOLEAN NOT NULL DEFAULT false,
    "isAquatic" BOOLEAN NOT NULL DEFAULT false,
    "requiresLilyPad" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_packets_pkey" PRIMARY KEY ("plantId")
);

-- CreateTable
CREATE TABLE "user_seed_packets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isInLoadout" BOOLEAN NOT NULL DEFAULT false,
    "loadoutSlot" INTEGER,

    CONSTRAINT "user_seed_packets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelNumber" INTEGER,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSavedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "environmentType" "EnvironmentType" NOT NULL,
    "gravesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fogEnabled" BOOLEAN NOT NULL DEFAULT false,
    "waterLaneIndices" INTEGER[],
    "slopeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "conveyorBelt" BOOLEAN NOT NULL DEFAULT false,
    "gridRows" INTEGER NOT NULL DEFAULT 5,
    "gridCols" INTEGER NOT NULL DEFAULT 9,
    "currentSun" INTEGER NOT NULL DEFAULT 50,
    "cumulativeSun" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "waveNumber" INTEGER NOT NULL DEFAULT 0,
    "nextWaveTimerMs" INTEGER NOT NULL DEFAULT 0,
    "totalZombiesKilled" INTEGER NOT NULL DEFAULT 0,
    "finalFlagSpawned" BOOLEAN NOT NULL DEFAULT false,
    "gridState" JSONB NOT NULL DEFAULT '[]',
    "zombieState" JSONB NOT NULL DEFAULT '[]',
    "seedCooldowns" JSONB NOT NULL DEFAULT '{}',
    "loadoutSnapshot" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_tokenHash_idx" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "levels_worldNumber_stageNumber_idx" ON "levels"("worldNumber", "stageNumber");

-- CreateIndex
CREATE INDEX "user_levels_userId_idx" ON "user_levels"("userId");

-- CreateIndex
CREATE INDEX "user_levels_userId_status_idx" ON "user_levels"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_levels_userId_levelNumber_key" ON "user_levels"("userId", "levelNumber");

-- CreateIndex
CREATE UNIQUE INDEX "seed_packets_plantType_key" ON "seed_packets"("plantType");

-- CreateIndex
CREATE INDEX "user_seed_packets_userId_idx" ON "user_seed_packets"("userId");

-- CreateIndex
CREATE INDEX "user_seed_packets_userId_isInLoadout_idx" ON "user_seed_packets"("userId", "isInLoadout");

-- CreateIndex
CREATE UNIQUE INDEX "user_seed_packets_userId_plantId_key" ON "user_seed_packets"("userId", "plantId");

-- CreateIndex
CREATE INDEX "game_sessions_userId_idx" ON "game_sessions"("userId");

-- CreateIndex
CREATE INDEX "game_sessions_userId_status_idx" ON "game_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "game_sessions_levelNumber_idx" ON "game_sessions"("levelNumber");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_levelNumber_fkey" FOREIGN KEY ("levelNumber") REFERENCES "levels"("levelNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_seed_packets" ADD CONSTRAINT "user_seed_packets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_seed_packets" ADD CONSTRAINT "user_seed_packets_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "seed_packets"("plantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_levelNumber_fkey" FOREIGN KEY ("levelNumber") REFERENCES "levels"("levelNumber") ON DELETE SET NULL ON UPDATE CASCADE;
