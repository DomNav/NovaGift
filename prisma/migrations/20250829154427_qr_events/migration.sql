-- CreateTable
CREATE TABLE "Envelope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "decimals" INTEGER NOT NULL,
    "sender" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "expiryTs" INTEGER NOT NULL,
    "message" TEXT,
    "fundedTxId" TEXT,
    "openedTxId" TEXT,
    "recipient" TEXT,
    "assetDelivered" TEXT,
    "amountDelivered" DECIMAL,
    "canceledTxId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fundedAt" DATETIME,
    "openedAt" DATETIME,
    "canceledAt" DATETIME
);

-- CreateTable
CREATE TABLE "Jti" (
    "jti" TEXT NOT NULL PRIMARY KEY,
    "envelopeId" TEXT NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Profile" (
    "wallet" TEXT NOT NULL PRIMARY KEY,
    "km" INTEGER NOT NULL DEFAULT 0,
    "usdEarned" DECIMAL NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'en',
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" DATETIME,
    "dataRetentionUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SwapReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "envelopeId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "txId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicKey" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "UserSkin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "skinId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSkin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "wallet" TEXT,
    "tags" JSONB DEFAULT [],
    "lastUsedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'STANDARD',
    "name" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "budget" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issueAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QrEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "eventType" TEXT NOT NULL,
    "poolSize" INTEGER NOT NULL,
    "amountAtomic" BIGINT NOT NULL,
    "generated" INTEGER NOT NULL DEFAULT 0,
    "redeemed" INTEGER NOT NULL DEFAULT 0,
    "spentAtomic" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "QrEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QrCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedContact" TEXT,
    "claimedAt" DATETIME,
    "claimTxHash" TEXT,
    "expiresAt" DATETIME,
    CONSTRAINT "QrCode_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "QrEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Envelope_sender_idx" ON "Envelope"("sender");

-- CreateIndex
CREATE INDEX "Jti_envelopeId_idx" ON "Jti"("envelopeId");

-- CreateIndex
CREATE INDEX "SwapReceipt_envelopeId_idx" ON "SwapReceipt"("envelopeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_publicKey_key" ON "User"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkin_userId_skinId_key" ON "UserSkin"("userId", "skinId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_email_key" ON "Contact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_wallet_key" ON "Contact"("wallet");

-- CreateIndex
CREATE INDEX "Contact_displayName_idx" ON "Contact"("displayName");

-- CreateIndex
CREATE INDEX "Contact_wallet_idx" ON "Contact"("wallet");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE UNIQUE INDEX "QrEvent_projectId_key" ON "QrEvent"("projectId");

-- CreateIndex
CREATE INDEX "QrEvent_startAt_endAt_idx" ON "QrEvent"("startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "QrCode_code_key" ON "QrCode"("code");

-- CreateIndex
CREATE INDEX "QrCode_eventId_status_idx" ON "QrCode"("eventId", "status");

-- CreateIndex
CREATE INDEX "QrCode_assignedContact_idx" ON "QrCode"("assignedContact");
