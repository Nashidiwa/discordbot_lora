-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_booster_perk_configs" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 21,
    "anchorRoleId" TEXT,
    "notificationChannelId" TEXT,
    "auditLogChannelId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_booster_perk_configs" ("anchorRoleId", "auditLogChannelId", "createdAt", "gracePeriodDays", "guildId", "notificationChannelId", "updatedAt") SELECT "anchorRoleId", "auditLogChannelId", "createdAt", "gracePeriodDays", "guildId", "notificationChannelId", "updatedAt" FROM "booster_perk_configs";
DROP TABLE "booster_perk_configs";
ALTER TABLE "new_booster_perk_configs" RENAME TO "booster_perk_configs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
