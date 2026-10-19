-- CreateTable
CREATE TABLE "booster_perk_configs" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 7,
    "anchorRoleId" TEXT,
    "notificationChannelId" TEXT,
    "auditLogChannelId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "custom_role_perks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "perkType" TEXT NOT NULL DEFAULT 'SERVER_BOOSTER',
    "boostCount" INTEGER NOT NULL DEFAULT 1,
    "roleId" TEXT,
    "roleName" TEXT,
    "roleColor" TEXT,
    "roleColor2" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isEquipped" BOOLEAN NOT NULL DEFAULT true,
    "gracePeriodExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "role_update_queues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queueCode" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "name" TEXT,
    "color1" TEXT NOT NULL,
    "color2" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedBy" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "custom_role_perks_guildId_status_idx" ON "custom_role_perks"("guildId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "custom_role_perks_guildId_userId_perkType_key" ON "custom_role_perks"("guildId", "userId", "perkType");

-- CreateIndex
CREATE INDEX "role_update_queues_guildId_status_idx" ON "role_update_queues"("guildId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "role_update_queues_guildId_queueCode_key" ON "role_update_queues"("guildId", "queueCode");
