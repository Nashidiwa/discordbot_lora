-- CreateTable
CREATE TABLE "voice_keeper_configs" (
    "guild_id" TEXT NOT NULL PRIMARY KEY,
    "channel_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "self_deaf" BOOLEAN NOT NULL DEFAULT true,
    "self_mute" BOOLEAN NOT NULL DEFAULT true,
    "auto_reconnect" BOOLEAN NOT NULL DEFAULT true,
    "last_connected_at" DATETIME,
    "updated_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
