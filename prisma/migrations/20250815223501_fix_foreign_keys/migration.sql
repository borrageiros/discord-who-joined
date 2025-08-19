-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AllowedRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "AllowedRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AllowedRole" ("guildId", "id", "roleId") SELECT "guildId", "id", "roleId" FROM "AllowedRole";
DROP TABLE "AllowedRole";
ALTER TABLE "new_AllowedRole" RENAME TO "AllowedRole";
CREATE UNIQUE INDEX "AllowedRole_guildId_roleId_key" ON "AllowedRole"("guildId", "roleId");
CREATE TABLE "new_AllowedUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "AllowedUser_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AllowedUser" ("guildId", "id", "userId") SELECT "guildId", "id", "userId" FROM "AllowedUser";
DROP TABLE "AllowedUser";
ALTER TABLE "new_AllowedUser" RENAME TO "AllowedUser";
CREATE UNIQUE INDEX "AllowedUser_guildId_userId_key" ON "AllowedUser"("guildId", "userId");
CREATE TABLE "new_WatcherConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notifySelfJoin" BOOLEAN NOT NULL DEFAULT false,
    "notifyWhileWatcherInVoice" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnMove" BOOLEAN NOT NULL DEFAULT false,
    "channelFilterMode" TEXT NOT NULL DEFAULT 'NONE',
    "messageTemplate" TEXT,
    "locale" TEXT,
    "timezone" TEXT,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 60,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WatcherConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WatcherConfig" ("channelFilterMode", "cooldownSeconds", "createdAt", "enabled", "guildId", "id", "locale", "messageTemplate", "notifyOnMove", "notifySelfJoin", "notifyWhileWatcherInVoice", "timezone", "updatedAt", "userId") SELECT "channelFilterMode", "cooldownSeconds", "createdAt", "enabled", "guildId", "id", "locale", "messageTemplate", "notifyOnMove", "notifySelfJoin", "notifyWhileWatcherInVoice", "timezone", "updatedAt", "userId" FROM "WatcherConfig";
DROP TABLE "WatcherConfig";
ALTER TABLE "new_WatcherConfig" RENAME TO "WatcherConfig";
CREATE INDEX "WatcherConfig_guildId_userId_idx" ON "WatcherConfig"("guildId", "userId");
CREATE UNIQUE INDEX "WatcherConfig_guildId_userId_key" ON "WatcherConfig"("guildId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
