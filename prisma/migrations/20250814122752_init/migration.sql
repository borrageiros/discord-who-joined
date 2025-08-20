-- CreateTable
CREATE TABLE "GuildConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "defaultLocale" TEXT,
    "defaultTimezone" TEXT,
    "defaultMessageTemplate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WatcherConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notifySelfJoin" BOOLEAN NOT NULL DEFAULT false,
    "notifyWhileWatcherInVoice" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnMove" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnBotJoin" BOOLEAN NOT NULL DEFAULT false,
    "channelFilterMode" TEXT NOT NULL DEFAULT 'NONE',
    "messageTemplate" TEXT,
    "locale" TEXT,
    "timezone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WatcherConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllowedRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "AllowedRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllowedUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "AllowedUser_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChannelFilter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watcherId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    CONSTRAINT "ChannelFilter_watcherId_fkey" FOREIGN KEY ("watcherId") REFERENCES "WatcherConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildConfig_guildId_key" ON "GuildConfig"("guildId");

-- CreateIndex
CREATE INDEX "WatcherConfig_guildId_userId_idx" ON "WatcherConfig"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatcherConfig_guildId_userId_key" ON "WatcherConfig"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AllowedRole_guildId_roleId_key" ON "AllowedRole"("guildId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "AllowedUser_guildId_userId_key" ON "AllowedUser"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelFilter_watcherId_channelId_key" ON "ChannelFilter"("watcherId", "channelId");
