-- CreateEnum
CREATE TYPE "NotifyChannel" AS ENUM ('sms', 'whatsapp', 'both', 'none');

-- CreateTable
CREATE TABLE "SalesPerson" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notifyChannel" "NotifyChannel" NOT NULL DEFAULT 'whatsapp',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tallyGuid" TEXT,
    "tallyName" TEXT,
    "syncStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "SalesPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "salesPersonId" TEXT,
    "creditDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tallyGuid" TEXT,
    "tallyName" TEXT,
    "syncStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutstandingInvoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditDays" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tallyGuid" TEXT,
    "tallyName" TEXT,
    "syncStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "OutstandingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutstandingLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "salesPersonId" TEXT NOT NULL,
    "clientIds" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OutstandingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "salesPersonId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "error" TEXT,
    "messageText" TEXT NOT NULL,
    "linkId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesPerson_name_key" ON "SalesPerson"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SalesPerson_tallyGuid_key" ON "SalesPerson"("tallyGuid");

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tallyGuid_key" ON "Client"("tallyGuid");

-- CreateIndex
CREATE UNIQUE INDEX "OutstandingInvoice_tallyGuid_key" ON "OutstandingInvoice"("tallyGuid");

-- CreateIndex
CREATE INDEX "OutstandingInvoice_dueDate_idx" ON "OutstandingInvoice"("dueDate");

-- CreateIndex
CREATE INDEX "OutstandingInvoice_clientId_idx" ON "OutstandingInvoice"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OutstandingInvoice_clientId_invoiceNo_key" ON "OutstandingInvoice"("clientId", "invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "OutstandingLink_tokenHash_key" ON "OutstandingLink"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_salesPersonId_channel_kind_scheduledFor_key" ON "NotificationLog"("salesPersonId", "channel", "kind", "scheduledFor");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "SalesPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutstandingInvoice" ADD CONSTRAINT "OutstandingInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutstandingLink" ADD CONSTRAINT "OutstandingLink_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "SalesPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "SalesPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
