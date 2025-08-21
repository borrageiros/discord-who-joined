-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WatcherConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notifySelfJoin" BOOLEAN NOT NULL DEFAULT false,
    "notifyWhileWatcherInVoice" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnMove" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnBotJoin" BOOLEAN NOT NULL DEFAULT false,
    "keepInSyncAcrossGuilds" BOOLEAN NOT NULL DEFAULT false,
    "channelFilterMode" TEXT NOT NULL DEFAULT 'NONE',
    "messageTemplate" TEXT,
    "locale" TEXT,
    "timezone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WatcherConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WatcherConfig" ("channelFilterMode", "createdAt", "enabled", "guildId", "id", "locale", "messageTemplate", "notifyOnBotJoin", "notifyOnMove", "notifySelfJoin", "notifyWhileWatcherInVoice", "timezone", "updatedAt", "userId") SELECT "channelFilterMode", "createdAt", "enabled", "guildId", "id", "locale", "messageTemplate", "notifyOnBotJoin", "notifyOnMove", "notifySelfJoin", "notifyWhileWatcherInVoice", "timezone", "updatedAt", "userId" FROM "WatcherConfig";
DROP TABLE "WatcherConfig";
ALTER TABLE "new_WatcherConfig" RENAME TO "WatcherConfig";
CREATE INDEX "WatcherConfig_guildId_userId_idx" ON "WatcherConfig"("guildId", "userId");
CREATE UNIQUE INDEX "WatcherConfig_guildId_userId_key" ON "WatcherConfig"("guildId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
