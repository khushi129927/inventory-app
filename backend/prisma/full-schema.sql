-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'executive');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('in-stock', 'low-stock', 'out-of-stock', 'discontinued');

-- CreateEnum
CREATE TYPE "OrderRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('product-added', 'product-updated', 'stock-in', 'stock-out', 'stock-adjusted', 'category-added', 'category-updated', 'low-stock-alert', 'order-requested', 'order-approved', 'order-rejected');

-- CreateEnum
CREATE TYPE "SavedBuildStatus" AS ENUM ('completed', 'draft', 'archived');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('in', 'out', 'adjustment', 'transfer');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tallyGuid" TEXT,
    "tallyName" TEXT,
    "syncStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tallyGuid" TEXT,
    "tallyName" TEXT,
    "syncStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "serialNumber" TEXT,
    "modelNumber" TEXT,
    "categoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "ProductStatus" NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "minStock" INTEGER NOT NULL,
    "monthlyInterest" DOUBLE PRECISION NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shipping" DOUBLE PRECISION,
    "installation" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tallyGuid" TEXT,
    "tallyName" TEXT,
    "syncStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStockSnapshot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductStockSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBranch" (
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "ProductBranch_pkey" PRIMARY KEY ("productId","branchId")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "location" TEXT,
    "reference" TEXT,
    "user" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tallyGuid" TEXT,
    "tallyName" TEXT,
    "syncStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityItem" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderRequest" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "status" "OrderRequestStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tallyGuid" TEXT,
    "tallyName" TEXT,
    "syncStatus" TEXT,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "OrderRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderRequestItem" (
    "id" TEXT NOT NULL,
    "orderRequestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OrderRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMargin" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductMargin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedBuild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SavedBuildStatus" NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "marginType" TEXT NOT NULL,
    "marginValue" DOUBLE PRECISION NOT NULL,
    "marginAmount" DOUBLE PRECISION NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedBuild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedBuildItem" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SavedBuildItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "warehouseLocation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_tallyGuid_key" ON "Branch"("tallyGuid");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tallyGuid_key" ON "Category"("tallyGuid");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tallyGuid_key" ON "Product"("tallyGuid");

-- CreateIndex
CREATE INDEX "ProductStockSnapshot_snapshotDate_idx" ON "ProductStockSnapshot"("snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockSnapshot_productId_snapshotDate_key" ON "ProductStockSnapshot"("productId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_tallyGuid_key" ON "StockMovement"("tallyGuid");

-- CreateIndex
CREATE UNIQUE INDEX "OrderRequest_tallyGuid_key" ON "OrderRequest"("tallyGuid");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMargin_productId_key" ON "ProductMargin"("productId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStockSnapshot" ADD CONSTRAINT "ProductStockSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBranch" ADD CONSTRAINT "ProductBranch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBranch" ADD CONSTRAINT "ProductBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRequestItem" ADD CONSTRAINT "OrderRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRequestItem" ADD CONSTRAINT "OrderRequestItem_orderRequestId_fkey" FOREIGN KEY ("orderRequestId") REFERENCES "OrderRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedBuildItem" ADD CONSTRAINT "SavedBuildItem_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "SavedBuild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedBuildItem" ADD CONSTRAINT "SavedBuildItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

