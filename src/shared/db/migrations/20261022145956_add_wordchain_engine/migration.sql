-- CreateTable
CREATE TABLE "word_chain_configs" (
    "guild_id" TEXT NOT NULL PRIMARY KEY,
    "normal_mode_channel_id" TEXT,
    "hard_mode_channel_id" TEXT,
    "reliable_role_id" TEXT,
    "failed_role_id" TEXT,
    "failed_member_id" TEXT,
    "correct_inputs_by_failed_member" INTEGER NOT NULL DEFAULT 0,
    "languages" TEXT NOT NULL DEFAULT 'en',
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "left_at" DATETIME,
    "current_word_normal" TEXT,
    "current_count_normal" INTEGER NOT NULL DEFAULT 0,
    "high_score_normal" INTEGER NOT NULL DEFAULT 0,
    "last_member_id_normal" TEXT,
    "current_word_hard" TEXT,
    "current_count_hard" INTEGER NOT NULL DEFAULT 0,
    "high_score_hard" INTEGER NOT NULL DEFAULT 0,
    "last_member_id_hard" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "word_chain_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "correct_inputs" INTEGER NOT NULL DEFAULT 0,
    "wrong_inputs" INTEGER NOT NULL DEFAULT 0,
    "karma" REAL NOT NULL DEFAULT 0.0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "word_chain_used_words" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "game_mode" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "word_chain_blacklists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "word_chain_whitelists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "word_chain_word_cache" (
    "word" TEXT NOT NULL PRIMARY KEY,
    "languages" TEXT NOT NULL,
    "is_negative" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "word_chain_banned_members" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "word_chain_configs_left_at_idx" ON "word_chain_configs"("left_at");

-- CreateIndex
CREATE INDEX "word_chain_members_guild_id_score_idx" ON "word_chain_members"("guild_id", "score");

-- CreateIndex
CREATE INDEX "word_chain_members_guild_id_karma_idx" ON "word_chain_members"("guild_id", "karma");

-- CreateIndex
CREATE UNIQUE INDEX "word_chain_members_guild_id_user_id_key" ON "word_chain_members"("guild_id", "user_id");

-- CreateIndex
CREATE INDEX "word_chain_used_words_guild_id_game_mode_idx" ON "word_chain_used_words"("guild_id", "game_mode");

-- CreateIndex
CREATE UNIQUE INDEX "word_chain_used_words_guild_id_game_mode_word_key" ON "word_chain_used_words"("guild_id", "game_mode", "word");

-- CreateIndex
CREATE UNIQUE INDEX "word_chain_blacklists_guild_id_word_key" ON "word_chain_blacklists"("guild_id", "word");

-- CreateIndex
CREATE UNIQUE INDEX "word_chain_whitelists_guild_id_word_key" ON "word_chain_whitelists"("guild_id", "word");

-- CreateIndex
CREATE INDEX "word_chain_word_cache_expires_at_idx" ON "word_chain_word_cache"("expires_at");
