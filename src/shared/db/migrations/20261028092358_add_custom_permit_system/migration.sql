-- CreateTable
CREATE TABLE "guild_permit_configs" (
    "guild_id" TEXT NOT NULL PRIMARY KEY,
    "trusted_admin_flags" INTEGER NOT NULL DEFAULT 29,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "guild_permit_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guild_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "permissions" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "guild_permit_assignments_guild_id_tier_idx" ON "guild_permit_assignments"("guild_id", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "guild_permit_assignments_guild_id_target_type_target_id_key" ON "guild_permit_assignments"("guild_id", "target_type", "target_id");
