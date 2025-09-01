/*
  Warnings:

  - You are about to drop the column `amountDelivered` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `asset` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `assetDelivered` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `canceledAt` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `canceledTxId` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `decimals` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `expiryTs` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `fundedAt` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `fundedTxId` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `hash` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `openedAt` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `openedTxId` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `recipient` on the `Envelope` table. All the data in the column will be lost.
  - You are about to drop the column `sender` on the `Envelope` table. All the data in the column will be lost.
  - Added the required column `assetCode` to the `Envelope` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contractId` to the `Envelope` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "EmailInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "envelopeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviteJwt" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Envelope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "assetIssuer" TEXT,
    "amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" DATETIME,
    "projectId" TEXT,
    "emailInviteId" TEXT
);
INSERT INTO "new_Envelope" ("amount", "createdAt", "id", "status") SELECT "amount", "createdAt", "id", "status" FROM "Envelope";
DROP TABLE "Envelope";
ALTER TABLE "new_Envelope" RENAME TO "Envelope";
CREATE UNIQUE INDEX "Envelope_contractId_key" ON "Envelope"("contractId");
CREATE INDEX "Envelope_status_idx" ON "Envelope"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EmailInvite_envelopeId_key" ON "EmailInvite"("envelopeId");
