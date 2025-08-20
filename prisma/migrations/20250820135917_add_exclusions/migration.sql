-- CreateTable
CREATE TABLE "ExcludedUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watcherId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ExcludedUser_watcherId_fkey" FOREIGN KEY ("watcherId") REFERENCES "WatcherConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExcludedRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watcherId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "ExcludedRole_watcherId_fkey" FOREIGN KEY ("watcherId") REFERENCES "WatcherConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExcludedUser_watcherId_userId_key" ON "ExcludedUser"("watcherId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExcludedRole_watcherId_roleId_key" ON "ExcludedRole"("watcherId", "roleId");
