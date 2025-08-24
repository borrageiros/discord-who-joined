-- CreateTable
CREATE TABLE "ExcludedChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watcherId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    CONSTRAINT "ExcludedChannel_watcherId_fkey" FOREIGN KEY ("watcherId") REFERENCES "WatcherConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncludedChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watcherId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    CONSTRAINT "IncludedChannel_watcherId_fkey" FOREIGN KEY ("watcherId") REFERENCES "WatcherConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExcludedChannel_watcherId_channelId_key" ON "ExcludedChannel"("watcherId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "IncludedChannel_watcherId_channelId_key" ON "IncludedChannel"("watcherId", "channelId");
