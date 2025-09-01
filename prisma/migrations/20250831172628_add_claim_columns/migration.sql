/*
  Warnings:

  - Added the required column `asset` to the `Envelope` table without a default value. This is not possible if the table is not empty.
  - Added the required column `decimals` to the `Envelope` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiryTs` to the `Envelope` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hash` to the `Envelope` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender` to the `Envelope` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Envelope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "sender" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "expiryTs" INTEGER NOT NULL,
    "message" TEXT,
    "fundedTxId" TEXT,
    "openedTxId" TEXT,
    "canceledTxId" TEXT,
    "recipient" TEXT,
    "assetDelivered" TEXT,
    "amountDelivered" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" DATETIME,
    "fundedAt" DATETIME,
    "openedAt" DATETIME,
    "contractId" TEXT,
    "assetCode" TEXT,
    "assetIssuer" TEXT,
    "claimedAt" DATETIME,
    "emailInviteId" TEXT,
    "projectId" TEXT
);
INSERT INTO "new_Envelope" ("amount", "assetCode", "assetIssuer", "claimedAt", "contractId", "createdAt", "emailInviteId", "id", "projectId", "status") SELECT "amount", "assetCode", "assetIssuer", "claimedAt", "contractId", "createdAt", "emailInviteId", "id", "projectId", "status" FROM "Envelope";
DROP TABLE "Envelope";
ALTER TABLE "new_Envelope" RENAME TO "Envelope";
CREATE UNIQUE INDEX "Envelope_contractId_key" ON "Envelope"("contractId");
CREATE INDEX "Envelope_status_idx" ON "Envelope"("status");
CREATE INDEX "Envelope_sender_idx" ON "Envelope"("sender");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
