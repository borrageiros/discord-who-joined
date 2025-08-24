-- CreateTable
CREATE TABLE "IncludedUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watcherId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "IncludedUser_watcherId_fkey" FOREIGN KEY ("watcherId") REFERENCES "WatcherConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncludedRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watcherId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "IncludedRole_watcherId_fkey" FOREIGN KEY ("watcherId") REFERENCES "WatcherConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IncludedUser_watcherId_userId_key" ON "IncludedUser"("watcherId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "IncludedRole_watcherId_roleId_key" ON "IncludedRole"("watcherId", "roleId");
