/*
  Warnings:

  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `siteId` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `action` on the `AlertResponse` table. All the data in the column will be lost.
  - You are about to drop the column `siteId` on the `AlertRule` table. All the data in the column will be lost.
  - You are about to drop the column `company` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `edges` on the `Workflow` table. All the data in the column will be lost.
  - You are about to drop the column `enabled` on the `Workflow` table. All the data in the column will be lost.
  - You are about to drop the column `rules` on the `Workflow` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Worksite` table. All the data in the column will be lost.
  - Added the required column `response` to the `AlertResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `connections` to the `Workflow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Worksite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `worksiteName` to the `Worksite` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Client_email_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Client";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "companyUsername" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT NOT NULL,
    "location" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    "ruleId" TEXT,
    "worksiteId" TEXT,
    CONSTRAINT "Alert_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Alert_worksiteId_fkey" FOREIGN KEY ("worksiteId") REFERENCES "Worksite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Alert" ("createdAt", "description", "id", "location", "metadata", "resolvedAt", "ruleId", "severity", "source", "status", "title", "updatedAt") SELECT "createdAt", "description", "id", "location", "metadata", "resolvedAt", "ruleId", "severity", "source", "status", "title", "updatedAt" FROM "Alert";
DROP TABLE "Alert";
ALTER TABLE "new_Alert" RENAME TO "Alert";
CREATE TABLE "new_AlertResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertResponse_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AlertResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AlertResponse" ("alertId", "createdAt", "id", "notes", "userId") SELECT "alertId", "createdAt", "id", "notes", "userId" FROM "AlertResponse";
DROP TABLE "AlertResponse";
ALTER TABLE "new_AlertResponse" RENAME TO "AlertResponse";
CREATE TABLE "new_AlertRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "condition" JSONB NOT NULL,
    "severity" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "worksiteId" TEXT,
    "userId" TEXT,
    CONSTRAINT "AlertRule_worksiteId_fkey" FOREIGN KEY ("worksiteId") REFERENCES "Worksite" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AlertRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AlertRule" ("condition", "createdAt", "description", "id", "isActive", "name", "severity", "updatedAt", "userId") SELECT "condition", "createdAt", "description", "id", "isActive", "name", "severity", "updatedAt", "userId" FROM "AlertRule";
DROP TABLE "AlertRule";
ALTER TABLE "new_AlertRule" RENAME TO "AlertRule";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "password" TEXT,
    "image" TEXT,
    "phoneNumber" TEXT,
    "role" TEXT NOT NULL DEFAULT 'worker',
    "companyId" TEXT,
    "worksiteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_worksiteId_fkey" FOREIGN KEY ("worksiteId") REFERENCES "Worksite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("approved", "createdAt", "email", "emailVerified", "id", "image", "name", "password", "phoneNumber", "role", "updatedAt", "verificationToken") SELECT "approved", "createdAt", "email", "emailVerified", "id", "image", "name", "password", "phoneNumber", "role", "updatedAt", "verificationToken" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");
CREATE TABLE "new_Worker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'worker',
    "worksiteId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Worker_worksiteId_fkey" FOREIGN KEY ("worksiteId") REFERENCES "Worksite" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Worker" ("createdAt", "email", "id", "name", "role", "updatedAt", "worksiteId") SELECT "createdAt", "email", "id", "name", "role", "updatedAt", "worksiteId" FROM "Worker";
DROP TABLE "Worker";
ALTER TABLE "new_Worker" RENAME TO "Worker";
CREATE UNIQUE INDEX "Worker_worksiteId_email_key" ON "Worker"("worksiteId", "email");
CREATE TABLE "new_Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "nodes" JSONB NOT NULL,
    "connections" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "siteId" TEXT,
    "userId" TEXT,
    CONSTRAINT "Workflow_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Workflow" ("createdAt", "description", "id", "name", "nodes", "updatedAt", "userId") SELECT "createdAt", "description", "id", "name", "nodes", "updatedAt", "userId" FROM "Workflow";
DROP TABLE "Workflow";
ALTER TABLE "new_Workflow" RENAME TO "Workflow";
CREATE TABLE "new_Worksite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "worksiteName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cameraSystemType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Worksite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Worksite" ("address", "cameraSystemType", "createdAt", "id", "name", "updatedAt") SELECT "address", "cameraSystemType", "createdAt", "id", "name", "updatedAt" FROM "Worksite";
DROP TABLE "Worksite";
ALTER TABLE "new_Worksite" RENAME TO "Worksite";
CREATE UNIQUE INDEX "Worksite_worksiteName_key" ON "Worksite"("worksiteName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Company_companyUsername_key" ON "Company"("companyUsername");

-- CreateIndex
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");
