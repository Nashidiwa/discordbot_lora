-- CreateTable
CREATE TABLE "swarm_member_metadata" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "swarm_level" INTEGER NOT NULL DEFAULT 0,
    "updated_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "swarm_oauth_tokens" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "scope" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "swarm_operators" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "added_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "swarm_guild_configs" (
    "guild_id" TEXT NOT NULL PRIMARY KEY,
    "notification_channel_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
