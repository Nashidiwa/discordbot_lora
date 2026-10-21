-- CreateTable
CREATE TABLE "donator_perk_configs" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "donatorRoleId" TEXT,
    "notificationChannelId" TEXT,
    "baseBenchmarkVnd" INTEGER NOT NULL DEFAULT 200000,
    "baseBenchmarkDays" INTEGER NOT NULL DEFAULT 30,
    "weeklyMinVnd" INTEGER NOT NULL DEFAULT 50000,
    "idleBurnRate" REAL NOT NULL DEFAULT 0.2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "donator_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditSeconds" REAL NOT NULL DEFAULT 0,
    "isEquipped" BOOLEAN NOT NULL DEFAULT true,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "currentWeekTotalVnd" INTEGER NOT NULL DEFAULT 0,
    "totalDonated" BIGINT NOT NULL DEFAULT 0,
    "lastDeductedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveWeekStart" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "donator_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "bonusVolumePercent" REAL NOT NULL DEFAULT 0,
    "bonusStreakPercent" REAL NOT NULL DEFAULT 0,
    "creditSecondsAdded" REAL NOT NULL,
    "actionType" TEXT NOT NULL,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "donator_accounts_guildId_isEquipped_idx" ON "donator_accounts"("guildId", "isEquipped");

-- CreateIndex
CREATE UNIQUE INDEX "donator_accounts_guildId_userId_key" ON "donator_accounts"("guildId", "userId");

-- CreateIndex
CREATE INDEX "donator_transactions_guildId_userId_idx" ON "donator_transactions"("guildId", "userId");
