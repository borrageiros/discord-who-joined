-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AllowedRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
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
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AllowedUser_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig" ("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AllowedUser" ("guildId", "id", "userId") SELECT "guildId", "id", "userId" FROM "AllowedUser";
DROP TABLE "AllowedUser";
ALTER TABLE "new_AllowedUser" RENAME TO "AllowedUser";
CREATE UNIQUE INDEX "AllowedUser_guildId_userId_key" ON "AllowedUser"("guildId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
